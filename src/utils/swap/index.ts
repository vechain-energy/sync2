import { createBetterSwapAggregator } from './better-swap'
import { createVeTradeAggregator } from './vetrade'
import { SwapAggregator, SwapNetwork } from './types'

export * from './better-swap'
export * from './helpers'
export * from './types'
export * from './vetrade'

export function getSwapAggregators(network: SwapNetwork): SwapAggregator[] {
    if (network !== 'main') {
        return []
    }
    return [
        createVeTradeAggregator(),
        createBetterSwapAggregator()
    ]
}
