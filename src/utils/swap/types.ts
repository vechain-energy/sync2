export type SwapNetwork = 'main' | 'unsupported'

export type SwapParams = {
    fromTokenAddress: string
    toTokenAddress: string
    amountIn: string
    userAddress: string
    slippageTolerance: number
}

export type SwapSimulation = {
    gasCostVTHO: number
    success: boolean
    error: string
}

export type SwapQuote = {
    aggregatorName: string
    outputAmount: string
    minimumOutputAmount: string
    data: SwapQuoteData
    reverted: boolean
    revertReason: string
    gasCostVTHO: number
}

export type SwapQuoteData = {
    kind: 'better-swap'
    path: string[]
    routerAddress: string
} | {
    kind: 'vetrade'
    clauses: Connex.VM.Clause[]
    path: string[]
}

export type BuiltSwapQuote = SwapQuote & {
    aggregator: SwapAggregator
}

export type SwapAggregator = {
    name: string
    getQuote(params: SwapParams, thor: Connex.Thor): Promise<SwapQuote>
    simulateSwap(params: SwapParams, quote: SwapQuote, thor: Connex.Thor): Promise<SwapSimulation>
    buildSwapTransaction(params: SwapParams, quote: SwapQuote): Promise<Connex.VM.Clause[]>
}

export type SwapQuoteResult = {
    quotes: BuiltSwapQuote[]
    bestQuote: BuiltSwapQuote | null
}
