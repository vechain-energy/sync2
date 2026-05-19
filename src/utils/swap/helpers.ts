import { BigNumber } from 'bignumber.js'
import { abi } from 'thor-devkit'
import { genesises } from '../../consts'
import { ZERO_ADDRESS, transferEventABI } from './abis'
import { BuiltSwapQuote, SwapAggregator, SwapNetwork, SwapParams, SwapQuote, SwapQuoteResult, SwapSimulation } from './types'

type TokenFlow = {
    inflow: BigNumber
    outflow: BigNumber
}

const transferEvent = new abi.Event(transferEventABI)

function cleanHexAddress(value: string): string {
    return value.trim().toLowerCase()
}

export function swapNetworkOf(gid: string): SwapNetwork {
    return gid === genesises.main.id ? 'main' : 'unsupported'
}

export function isVetAddress(address: string): boolean {
    const normalized = cleanHexAddress(address)
    return normalized === '' || normalized === '0x' || normalized === ZERO_ADDRESS
}

export function normalizeSwapTokenAddress(address: string): string {
    return isVetAddress(address) ? '0x' : address
}

export function canonicalFlowAddress(address: string): string {
    return isVetAddress(address) ? ZERO_ADDRESS : cleanHexAddress(address)
}

export function hexToDecimalString(value: string | number): string {
    const text = value.toString()
    return text.slice(0, 2).toLowerCase() === '0x'
        ? new BigNumber(text.slice(2), 16).toFixed(0)
        : text
}

export function calculateMinimumOutput(outputAmount: string, slippageTolerance: number): string {
    const slippageBps = Math.max(0, Math.min(10000, Math.round(slippageTolerance * 100)))
    return new BigNumber(outputAmount)
        .times(10000 - slippageBps)
        .idiv(10000)
        .toFixed(0)
}

export function getSwapDeadline(now = Date.now()): string {
    return Math.floor(now / 1000 + 20 * 60).toString()
}

export function buildSwapSigners(wallet: M.Wallet | null, selectedAddress: string): string[] {
    if (!wallet || !selectedAddress) {
        return []
    }
    const selected = selectedAddress.toLowerCase()
    return [
        selectedAddress,
        ...wallet.meta.addresses.filter(addr => addr.toLowerCase() !== selected)
    ]
}

export function decodedStringArray(decoded: Record<string | number, unknown>, key: string): string[] {
    const value = decoded[key] || decoded[0]
    if (!Array.isArray(value)) {
        return []
    }
    return value.map(item => {
        return typeof item === 'string' || typeof item === 'number'
            ? item.toString()
            : '0'
    })
}

function emptyFlow(): TokenFlow {
    return {
        inflow: new BigNumber(0),
        outflow: new BigNumber(0)
    }
}

function mergeFlow(flows: Record<string, TokenFlow>, tokenAddress: string, next: TokenFlow) {
    const current = flows[tokenAddress] || emptyFlow()
    flows[tokenAddress] = {
        inflow: current.inflow.plus(next.inflow),
        outflow: current.outflow.plus(next.outflow)
    }
}

function tokenFlowsFromOutput(
    output: Connex.VM.Output,
    clause: Connex.VM.Clause,
    userAddress: string
): Record<string, TokenFlow> {
    const flows: Record<string, TokenFlow> = {}
    const user = userAddress.toLowerCase()

    for (const event of output.events) {
        try {
            const decoded = transferEvent.decode(event.data, event.topics)
            const from = typeof decoded._from === 'string' ? decoded._from.toLowerCase() : ''
            const to = typeof decoded._to === 'string' ? decoded._to.toLowerCase() : ''
            const rawValue = decoded._value || decoded[2] || '0'
            const value = new BigNumber(rawValue.toString())

            if (from !== user && to !== user) {
                continue
            }

            mergeFlow(flows, cleanHexAddress(event.address), {
                inflow: to === user ? value : new BigNumber(0),
                outflow: from === user ? value : new BigNumber(0)
            })
        } catch {
        }
    }

    const clauseValue = new BigNumber(clause.value || 0)
    if (clauseValue.isGreaterThan(0)) {
        mergeFlow(flows, ZERO_ADDRESS, {
            inflow: new BigNumber(0),
            outflow: clauseValue
        })
    }

    for (const transfer of output.transfers) {
        if (transfer.recipient.toLowerCase() !== user) {
            continue
        }
        mergeFlow(flows, ZERO_ADDRESS, {
            inflow: new BigNumber(transfer.amount),
            outflow: new BigNumber(0)
        })
    }

    return flows
}

function explainSwapFailure(params: SwapParams, quote: SwapQuote, flows: Record<string, TokenFlow>): string {
    const fromToken = canonicalFlowAddress(params.fromTokenAddress)
    const toToken = canonicalFlowAddress(params.toTokenAddress)
    const expectedOutflow = new BigNumber(params.amountIn)
    const minimumInflow = new BigNumber(quote.minimumOutputAmount || 0)
    const fromFlow = flows[fromToken] || emptyFlow()
    const toFlow = flows[toToken] || emptyFlow()

    if (fromFlow.outflow.isGreaterThan(expectedOutflow)) {
        return `Unexpected ${fromToken === ZERO_ADDRESS ? 'VET' : 'token'} outflow`
    }

    for (const tokenAddress of Object.keys(flows)) {
        if (tokenAddress !== fromToken && flows[tokenAddress].outflow.isGreaterThan(0)) {
            return 'Unexpected token outflow'
        }
    }

    if (minimumInflow.isGreaterThan(0) && toFlow.inflow.isLessThan(minimumInflow)) {
        return `Expected at least ${minimumInflow.toFixed(0)} out`
    }

    return ''
}

export async function simulateSwapWithClauses(
    params: SwapParams,
    quote: SwapQuote,
    clauses: Connex.VM.Clause[],
    thor: Connex.Thor
): Promise<SwapSimulation> {
    try {
        if (clauses.length === 0) {
            return { gasCostVTHO: 0, success: false, error: 'No swap clauses' }
        }

        const outputs = await thor.explain(clauses)
            .caller(params.userAddress)
            .gas(2000 * 10000)
            .execute()

        const flows: Record<string, TokenFlow> = {}
        let gasUsed = 200000

        outputs.forEach((output, index) => {
            gasUsed += output.gasUsed
            if (output.reverted) {
                throw new Error(output.revertReason || output.vmError || 'Transaction reverted')
            }

            const clauseFlows = tokenFlowsFromOutput(output, clauses[index], params.userAddress)
            Object.keys(clauseFlows).forEach(tokenAddress => {
                mergeFlow(flows, tokenAddress, clauseFlows[tokenAddress])
            })
        })

        const flowError = explainSwapFailure(params, quote, flows)
        if (flowError) {
            return { gasCostVTHO: gasUsed / 1e5, success: false, error: flowError }
        }

        return { gasCostVTHO: gasUsed / 1e5, success: true, error: '' }
    } catch (err) {
        return {
            gasCostVTHO: 0,
            success: false,
            error: err instanceof Error ? err.message : 'Simulation failed'
        }
    }
}

export function selectBestQuote(quotes: BuiltSwapQuote[]): BuiltSwapQuote | null {
    const available = quotes.filter(quote => !quote.reverted && new BigNumber(quote.outputAmount || 0).isGreaterThan(0))
    if (available.length === 0) {
        return null
    }
    return available.reduce((best, item) => {
        return new BigNumber(item.outputAmount).isGreaterThan(best.outputAmount) ? item : best
    }, available[0])
}

export async function getSwapQuotes(
    params: SwapParams,
    thor: Connex.Thor,
    aggregators: SwapAggregator[]
): Promise<SwapQuoteResult> {
    const quoted = await Promise.all(aggregators.map(async aggregator => {
        try {
            const quote = await aggregator.getQuote(params, thor)
            if (!new BigNumber(quote.outputAmount || 0).isGreaterThan(0)) {
                return null
            }
            const simulation = await aggregator.simulateSwap(params, quote, thor)
            return {
                ...quote,
                aggregator,
                reverted: !simulation.success,
                revertReason: simulation.error,
                gasCostVTHO: simulation.gasCostVTHO
            }
        } catch (err) {
            console.warn(`${aggregator.name} quote failed`, err)
            return null
        }
    }))

    const quotes = quoted.filter((quote): quote is BuiltSwapQuote => quote !== null)
    return {
        quotes,
        bestQuote: selectBestQuote(quotes)
    }
}
