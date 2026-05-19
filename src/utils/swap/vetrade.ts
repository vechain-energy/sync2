import axios from 'axios'
import { abi } from 'thor-devkit'
import { approveABI } from './abis'
import { hexToDecimalString, isVetAddress, simulateSwapWithClauses } from './helpers'
import { SwapAggregator, SwapParams, SwapQuote, SwapSimulation } from './types'

export const VETRADE_QUOTE_URL = 'https://vetrade.vet/api/quote/vck'
export const VETRADE_SUPPORTED_ADDRESSES = [
    '0xE5fA980a6EfE5B79C2150a529da06AeF455963b6',
    '0x7C755EC0165fCD926cC6faB10E7BB16a72E9f34A'
]

type ApiAbiParameter = {
    name: string
    type: string
    internalType?: string
    components?: ApiAbiParameter[]
}

type ApiAbiFunction = {
    name?: string
    type?: string
    inputs?: ApiAbiParameter[]
    outputs?: ApiAbiParameter[]
    stateMutability?: string
}

type ApiFunctionCall = {
    functionName?: string
    name?: string
    abi: ApiAbiFunction[] | ApiAbiParameter[]
    args: unknown[]
}

type ApiClause = {
    to: string
    value: string
    comment?: string
    functionCall: ApiFunctionCall
}

type ApiQuoteResponse = {
    amountOut: string
    amountOutMin: string
    clauses: ApiClause[]
    path: string[]
}

function isFunctionAbiItem(item: ApiAbiFunction | ApiAbiParameter): item is ApiAbiFunction {
    return item.type === 'function' || Array.isArray((item as ApiAbiFunction).inputs)
}

function normalizeStateMutability(value: string | undefined): abi.Function.StateMutability {
    switch (value) {
        case 'pure':
        case 'view':
        case 'constant':
        case 'payable':
        case 'nonpayable':
            return value
        default:
            return 'nonpayable'
    }
}

export function normalizeApiFunctionDefinition(functionCall: ApiFunctionCall): abi.Function.Definition {
    const functionName = functionCall.functionName || functionCall.name
    if (!functionName) {
        throw new Error('Function name missing')
    }

    const abiItems: Array<ApiAbiFunction | ApiAbiParameter> = functionCall.abi
    const found = abiItems.find((item: ApiAbiFunction | ApiAbiParameter) => {
        return isFunctionAbiItem(item) && item.name === functionName
    })

    if (found && isFunctionAbiItem(found)) {
        return {
            type: 'function',
            name: functionName,
            inputs: found.inputs || [],
            outputs: found.outputs || [],
            stateMutability: normalizeStateMutability(found.stateMutability),
            constant: found.stateMutability === 'view' || found.stateMutability === 'pure',
            payable: found.stateMutability === 'payable'
        }
    }

    return {
        type: 'function',
        name: functionName,
        inputs: functionCall.abi as ApiAbiParameter[],
        outputs: [],
        stateMutability: 'nonpayable',
        constant: false,
        payable: false
    }
}

export function encodeApiFunctionCall(functionCall: ApiFunctionCall): string {
    const func = new abi.Function(normalizeApiFunctionDefinition(functionCall))
    return func.encode(...functionCall.args)
}

export function convertApiClauseToClause(apiClause: ApiClause): Connex.VM.Clause {
    return {
        to: apiClause.to,
        value: hexToDecimalString(apiClause.value || '0'),
        data: encodeApiFunctionCall(apiClause.functionCall)
    }
}

function isSupportedClause(clause: Connex.VM.Clause): boolean {
    if (!clause.to) {
        return false
    }
    const to = clause.to.toLowerCase()
    return VETRADE_SUPPORTED_ADDRESSES.some(addr => addr.toLowerCase() === to)
}

export function buildVeTradeTransaction(params: SwapParams, quote: SwapQuote): Connex.VM.Clause[] {
    const data = quote.data
    if (data.kind !== 'vetrade') {
        throw new Error('Invalid VeTrade quote')
    }

    const baseClauses = data.clauses.filter(isSupportedClause)
    if (baseClauses.length === 0) {
        throw new Error('No supported VeTrade clauses')
    }

    if (isVetAddress(params.fromTokenAddress)) {
        return [{
            ...baseClauses[0],
            value: params.amountIn
        }, ...baseClauses.slice(1)]
    }

    const approveFunc = new abi.Function(approveABI)
    return [{
        to: params.fromTokenAddress,
        value: 0,
        data: approveFunc.encode(baseClauses[0].to, params.amountIn)
    }, ...baseClauses]
}

export function createVeTradeAggregator(): SwapAggregator {
    return {
        name: 'VeTrade.vet',
        async getQuote(params: SwapParams): Promise<SwapQuote> {
            try {
                const response = await axios.get(VETRADE_QUOTE_URL, {
                    params: {
                        fromAddress: params.fromTokenAddress,
                        toAddress: params.toTokenAddress,
                        amountIn: params.amountIn,
                        recipient: params.userAddress,
                        slippageBps: Math.round(params.slippageTolerance * 100).toString(),
                        network: 'main'
                    }
                })
                const quoteData = response.data as ApiQuoteResponse
                const clauses = quoteData.clauses.map(convertApiClauseToClause)
                return {
                    aggregatorName: this.name,
                    outputAmount: quoteData.amountOut || '0',
                    minimumOutputAmount: quoteData.amountOutMin || '0',
                    data: {
                        kind: 'vetrade',
                        clauses,
                        path: quoteData.path || []
                    },
                    reverted: false,
                    revertReason: '',
                    gasCostVTHO: 0
                }
            } catch (err) {
                console.warn('VeTrade quote failed', err)
                return {
                    aggregatorName: this.name,
                    outputAmount: '0',
                    minimumOutputAmount: '0',
                    data: {
                        kind: 'vetrade',
                        clauses: [],
                        path: []
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
            return Promise.resolve(buildVeTradeTransaction(params, quote))
        }
    }
}
