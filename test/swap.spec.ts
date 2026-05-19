/* eslint-env mocha */
import * as assert from 'assert'
import { abi } from 'thor-devkit'
import {
    approveABI,
    swapExactETHForTokensABI,
    swapExactTokensForETHABI,
    swapExactTokensForTokensABI
} from '../src/utils/swap/abis'
import {
    BETTER_SWAP_ROUTER,
    BETTER_SWAP_WVET,
    VETRADE_SUPPORTED_ADDRESSES,
    buildBetterSwapTransaction,
    buildSwapSigners,
    calculateMinimumOutput,
    convertApiClauseToClause,
    encodeApiFunctionCall,
    normalizeSwapTokenAddress,
    selectBestQuote
} from '../src/utils/swap'
import { buildVeTradeTransaction } from '../src/utils/swap/vetrade'
import { BuiltSwapQuote, SwapParams, SwapQuote } from '../src/utils/swap/types'

const USER = '0x9999999999999999999999999999999999999999'
const TOKEN_A = '0x1111111111111111111111111111111111111111'
const TOKEN_B = '0x2222222222222222222222222222222222222222'

function params(fromTokenAddress: string, toTokenAddress: string): SwapParams {
    return {
        fromTokenAddress,
        toTokenAddress,
        amountIn: '1000000000000000000',
        userAddress: USER,
        slippageTolerance: 1
    }
}

function betterQuote(fromTokenAddress: string, toTokenAddress: string): SwapQuote {
    return {
        aggregatorName: 'BetterSwap.io',
        outputAmount: '2000000000000000000',
        minimumOutputAmount: '1980000000000000000',
        data: {
            kind: 'better-swap',
            path: [
                normalizeSwapTokenAddress(fromTokenAddress) === '0x' ? BETTER_SWAP_WVET : fromTokenAddress,
                normalizeSwapTokenAddress(toTokenAddress) === '0x' ? BETTER_SWAP_WVET : toTokenAddress
            ],
            routerAddress: BETTER_SWAP_ROUTER
        },
        reverted: false,
        revertReason: '',
        gasCostVTHO: 0
    }
}

describe('swap helpers', () => {
    it('calculates minimum output with slippage', () => {
        assert.strictEqual(calculateMinimumOutput('1000', 1), '990')
        assert.strictEqual(calculateMinimumOutput('1000', 0.5), '995')
        assert.strictEqual(calculateMinimumOutput('1000', 3), '970')
    })

    it('normalizes native VET token addresses', () => {
        assert.strictEqual(normalizeSwapTokenAddress(''), '0x')
        assert.strictEqual(normalizeSwapTokenAddress('0x0000000000000000000000000000000000000000'), '0x')
        assert.strictEqual(normalizeSwapTokenAddress(TOKEN_A), TOKEN_A)
    })

    it('builds BetterSwap VET to token clause', () => {
        const quote = betterQuote('0x', TOKEN_A)
        const clauses = buildBetterSwapTransaction(params('0x', TOKEN_A), quote, '123')
        const swapFunc = new abi.Function(swapExactETHForTokensABI)

        assert.strictEqual(clauses.length, 1)
        assert.strictEqual(clauses[0].to, BETTER_SWAP_ROUTER)
        assert.strictEqual(clauses[0].value, '1000000000000000000')
        assert.strictEqual(
            clauses[0].data,
            swapFunc.encode('1980000000000000000', [BETTER_SWAP_WVET, TOKEN_A], USER, '123')
        )
    })

    it('builds BetterSwap token to VET clauses', () => {
        const quote = betterQuote(TOKEN_A, '0x')
        const clauses = buildBetterSwapTransaction(params(TOKEN_A, '0x'), quote, '123')
        const approveFunc = new abi.Function(approveABI)
        const swapFunc = new abi.Function(swapExactTokensForETHABI)

        assert.strictEqual(clauses.length, 2)
        assert.strictEqual(clauses[0].to, TOKEN_A)
        assert.strictEqual(clauses[0].data, approveFunc.encode(BETTER_SWAP_ROUTER, '1000000000000000000'))
        assert.strictEqual(clauses[1].to, BETTER_SWAP_ROUTER)
        assert.strictEqual(
            clauses[1].data,
            swapFunc.encode('1000000000000000000', '1980000000000000000', [TOKEN_A, BETTER_SWAP_WVET], USER, '123')
        )
    })

    it('builds BetterSwap token to token clauses', () => {
        const quote = betterQuote(TOKEN_A, TOKEN_B)
        const clauses = buildBetterSwapTransaction(params(TOKEN_A, TOKEN_B), quote, '123')
        const swapFunc = new abi.Function(swapExactTokensForTokensABI)

        assert.strictEqual(clauses.length, 2)
        assert.strictEqual(clauses[1].to, BETTER_SWAP_ROUTER)
        assert.strictEqual(
            clauses[1].data,
            swapFunc.encode('1000000000000000000', '1980000000000000000', [TOKEN_A, TOKEN_B], USER, '123')
        )
    })

    it('normalizes and encodes VeTrade API clauses', () => {
        const encoded = encodeApiFunctionCall({
            functionName: 'swapExactTokensForTokens',
            abi: [
                { name: 'amountIn', type: 'uint256' },
                { name: 'amountOutMin', type: 'uint256' },
                { name: 'path', type: 'address[]' },
                { name: 'to', type: 'address' },
                { name: 'deadline', type: 'uint256' }
            ],
            args: ['1', '2', [TOKEN_A, TOKEN_B], USER, '123']
        })
        const swapFunc = new abi.Function(swapExactTokensForTokensABI)
        assert.strictEqual(encoded, swapFunc.encode('1', '2', [TOKEN_A, TOKEN_B], USER, '123'))

        const clause = convertApiClauseToClause({
            to: VETRADE_SUPPORTED_ADDRESSES[0],
            value: '0x10',
            functionCall: {
                name: 'swapExactTokensForTokens',
                abi: [swapExactTokensForTokensABI],
                args: ['1', '2', [TOKEN_A, TOKEN_B], USER, '123']
            }
        })

        assert.strictEqual(clause.to, VETRADE_SUPPORTED_ADDRESSES[0])
        assert.strictEqual(clause.value, '16')
        assert.strictEqual(clause.data, swapFunc.encode('1', '2', [TOKEN_A, TOKEN_B], USER, '123'))
    })

    it('filters VeTrade clauses and prepends approval for token swaps', () => {
        const quote: SwapQuote = {
            aggregatorName: 'VeTrade.vet',
            outputAmount: '2',
            minimumOutputAmount: '1',
            data: {
                kind: 'vetrade',
                path: [TOKEN_A, TOKEN_B],
                clauses: [
                    { to: '0x3333333333333333333333333333333333333333', value: 0, data: '0x01' },
                    { to: VETRADE_SUPPORTED_ADDRESSES[0], value: 0, data: '0x02' }
                ]
            },
            reverted: false,
            revertReason: '',
            gasCostVTHO: 0
        }
        const clauses = buildVeTradeTransaction(params(TOKEN_A, TOKEN_B), quote)
        const approveFunc = new abi.Function(approveABI)

        assert.strictEqual(clauses.length, 2)
        assert.strictEqual(clauses[0].to, TOKEN_A)
        assert.strictEqual(clauses[0].data, approveFunc.encode(VETRADE_SUPPORTED_ADDRESSES[0], '1000000000000000000'))
        assert.strictEqual(clauses[1].to, VETRADE_SUPPORTED_ADDRESSES[0])
    })

    it('selects the best available quote', () => {
        const aggregator = {
            name: 'test',
            getQuote: () => Promise.reject(new Error('unused')),
            simulateSwap: () => Promise.reject(new Error('unused')),
            buildSwapTransaction: () => Promise.resolve([])
        }
        const quotes: BuiltSwapQuote[] = [
            { ...betterQuote(TOKEN_A, TOKEN_B), aggregator, aggregatorName: 'low', outputAmount: '10' },
            { ...betterQuote(TOKEN_A, TOKEN_B), aggregator, aggregatorName: 'bad', outputAmount: '99', reverted: true },
            { ...betterQuote(TOKEN_A, TOKEN_B), aggregator, aggregatorName: 'best', outputAmount: '11' },
            { ...betterQuote(TOKEN_A, TOKEN_B), aggregator, aggregatorName: 'zero', outputAmount: '0' }
        ]

        assert.strictEqual(selectBestQuote(quotes)!.aggregatorName, 'best')
    })

    it('orders selected wallet signers first', () => {
        const wallet: M.Wallet = {
            id: 1,
            gid: '0x0',
            vault: '',
            meta: {
                name: 'Wallet',
                type: 'hd',
                addresses: [TOKEN_A, TOKEN_B]
            }
        }

        assert.deepStrictEqual(buildSwapSigners(wallet, TOKEN_B), [TOKEN_B, TOKEN_A])
    })
})
