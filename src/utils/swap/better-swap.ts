import { abi } from 'thor-devkit'
import {
    approveABI,
    getAmountsOutABI,
    swapExactETHForTokensABI,
    swapExactTokensForETHABI,
    swapExactTokensForTokensABI
} from './abis'
import {
    calculateMinimumOutput,
    getSwapDeadline,
    isVetAddress,
    simulateSwapWithClauses
} from './helpers'
import { SwapAggregator, SwapParams, SwapQuote, SwapSimulation } from './types'

export const BETTER_SWAP_ROUTER = '0xf21Dd7108D93af56FaB07423EfB90F4a3604DA89'
export const BETTER_SWAP_WVET = '0xf9b02b47694fd635A413F16dC7B38aF06Cc16fe5'

function swapPath(params: SwapParams): string[] {
    return [
        isVetAddress(params.fromTokenAddress) ? BETTER_SWAP_WVET : params.fromTokenAddress,
        isVetAddress(params.toTokenAddress) ? BETTER_SWAP_WVET : params.toTokenAddress
    ]
}

function readOutputAmount(decoded: Record<string | number, unknown>): string {
    const value = decoded.amounts || decoded[0]
    if (!Array.isArray(value) || value.length === 0) {
        return '0'
    }
    const last = value[value.length - 1]
    return typeof last === 'string' || typeof last === 'number' ? last.toString() : '0'
}

export function buildBetterSwapTransaction(
    params: SwapParams,
    quote: SwapQuote,
    deadline = getSwapDeadline()
): Connex.VM.Clause[] {
    const data = quote.data
    if (data.kind !== 'better-swap') {
        throw new Error('Invalid BetterSwap quote')
    }

    const fromIsVet = isVetAddress(params.fromTokenAddress)
    const toIsVet = isVetAddress(params.toTokenAddress)
    const clauses: Connex.VM.Clause[] = []

    if (fromIsVet) {
        const swapFunc = new abi.Function(swapExactETHForTokensABI)
        clauses.push({
            to: data.routerAddress,
            value: params.amountIn,
            data: swapFunc.encode(
                quote.minimumOutputAmount,
                data.path,
                params.userAddress,
                deadline
            )
        })
        return clauses
    }

    const approveFunc = new abi.Function(approveABI)
    clauses.push({
        to: params.fromTokenAddress,
        value: 0,
        data: approveFunc.encode(data.routerAddress, params.amountIn)
    })

    if (toIsVet) {
        const swapFunc = new abi.Function(swapExactTokensForETHABI)
        clauses.push({
            to: data.routerAddress,
            value: 0,
            data: swapFunc.encode(
                params.amountIn,
                quote.minimumOutputAmount,
                data.path,
                params.userAddress,
                deadline
            )
        })
        return clauses
    }

    const swapFunc = new abi.Function(swapExactTokensForTokensABI)
    clauses.push({
        to: data.routerAddress,
        value: 0,
        data: swapFunc.encode(
            params.amountIn,
            quote.minimumOutputAmount,
            data.path,
            params.userAddress,
            deadline
        )
    })
    return clauses
}

export function createBetterSwapAggregator(): SwapAggregator {
    return {
        name: 'BetterSwap.io',
        async getQuote(params: SwapParams, thor: Connex.Thor): Promise<SwapQuote> {
            const path = swapPath(params)
            try {
                const output = await thor.account(BETTER_SWAP_ROUTER)
                    .method(getAmountsOutABI)
                    .call(params.amountIn, path)
                const outputAmount = readOutputAmount(output.decoded as Record<string | number, unknown>)
                return {
                    aggregatorName: this.name,
                    outputAmount,
                    minimumOutputAmount: calculateMinimumOutput(outputAmount, params.slippageTolerance),
                    data: {
                        kind: 'better-swap',
                        path,
                        routerAddress: BETTER_SWAP_ROUTER
                    },
                    reverted: false,
                    revertReason: '',
                    gasCostVTHO: 0
                }
            } catch (err) {
                console.warn('BetterSwap quote failed', err)
                return {
                    aggregatorName: this.name,
                    outputAmount: '0',
                    minimumOutputAmount: '0',
                    data: {
                        kind: 'better-swap',
                        path,
                        routerAddress: BETTER_SWAP_ROUTER
                    },
                    reverted: true,
                    revertReason: err instanceof Error ? err.message : 'Quote failed',
                    gasCostVTHO: 0
                }
            }
        },
        async simulateSwap(params: SwapParams, quote: SwapQuote, thor: Connex.Thor): Promise<SwapSimulation> {
            return simulateSwapWithClauses(params, quote, await this.buildSwapTransaction(params, quote), thor)
        },
        buildSwapTransaction(params: SwapParams, quote: SwapQuote): Promise<Connex.VM.Clause[]> {
            return Promise.resolve(buildBetterSwapTransaction(params, quote))
        }
    }
}
