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
    canonicalFlowAddress,
    convertApiClauseToClause,
    createBetterSwapAggregator,
    createVeTradeAggregator,
    decodedStringArray,
    encodeApiFunctionCall,
    getSwapAggregators,
    getSwapDeadline,
    getSwapQuotes,
    hexToDecimalString,
    normalizeApiFunctionDefinition,
    normalizeSwapTokenAddress,
    selectBestQuote,
    simulateSwapWithClauses,
    swapNetworkOf
} from '../src/utils/swap'
import { buildVeTradeTransaction } from '../src/utils/swap/vetrade'
import { ZERO_ADDRESS, getAmountsOutABI, transferEventABI } from '../src/utils/swap/abis'
import { BuiltSwapQuote, SwapAggregator, SwapParams, SwapQuote } from '../src/utils/swap/types'
import axios from 'axios'
import { genesises } from '../src/consts'

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

function thorWithOutputs(outputs: Connex.VM.Output[]): Connex.Thor {
    return {
        explain: () => ({
            caller: () => ({
                gas: () => ({
                    execute: () => Promise.resolve(outputs)
                })
            })
        })
    } as unknown as Connex.Thor
}

function output(partial: Partial<Connex.VM.Output>): Connex.VM.Output {
    return {
        events: [],
        transfers: [],
        gasUsed: 1000,
        reverted: false,
        vmError: '',
        revertReason: '',
        ...partial
    } as Connex.VM.Output
}

const transferEvent = new abi.Event(transferEventABI)

function eventTopicAddress(address: string): string {
    return `0x${address.toLowerCase().replace(/^0x/, '').padStart(64, '0')}`
}

function eventUint256Data(value: string): string {
    return `0x${BigInt(value).toString(16).padStart(64, '0')}`
}

function transferLog(token: string, from: string, to: string, value: string): Connex.VM.Event {
    return {
        address: token,
        topics: [
            transferEvent.signature,
            eventTopicAddress(from),
            eventTopicAddress(to)
        ],
        data: eventUint256Data(value)
    } as Connex.VM.Event
}

function thorRejectingSimulation(reason: unknown): Connex.Thor {
    return {
        explain: () => ({
            caller: () => ({
                gas: () => ({
                    execute: () => Promise.reject(reason)
                })
            })
        })
    } as unknown as Connex.Thor
}

describe('swap helpers', () => {
    it('calculates minimum output with slippage', () => {
        assert.strictEqual(calculateMinimumOutput('1000', 1), '990')
        assert.strictEqual(calculateMinimumOutput('1000', 0.5), '995')
        assert.strictEqual(calculateMinimumOutput('1000', 3), '970')
        assert.strictEqual(calculateMinimumOutput('1000', -1), '1000')
        assert.strictEqual(calculateMinimumOutput('1000', 200), '0')
    })

    it('normalizes native VET token addresses', () => {
        assert.strictEqual(normalizeSwapTokenAddress(''), '0x')
        assert.strictEqual(normalizeSwapTokenAddress('0x0000000000000000000000000000000000000000'), '0x')
        assert.strictEqual(normalizeSwapTokenAddress(TOKEN_A), TOKEN_A)
        assert.strictEqual(canonicalFlowAddress('0x'), ZERO_ADDRESS)
        assert.strictEqual(canonicalFlowAddress(` ${TOKEN_A.toUpperCase()} `), TOKEN_A)
        assert.strictEqual(swapNetworkOf(genesises.main.id), 'main')
        assert.strictEqual(swapNetworkOf(genesises.test.id), 'unsupported')
        assert.strictEqual(hexToDecimalString('0x10'), '16')
        assert.strictEqual(hexToDecimalString(25), '25')
        assert.strictEqual(getSwapDeadline(1704067200000), '1704068400')
    })

    it('decodes string arrays from named or indexed ABI outputs', () => {
        assert.deepStrictEqual(decodedStringArray({ amounts: ['1', 2, null] }, 'amounts'), ['1', '2', '0'])
        assert.deepStrictEqual(decodedStringArray({ 0: ['3'] }, 'amounts'), ['3'])
        assert.deepStrictEqual(decodedStringArray({ amounts: 'bad' }, 'amounts'), [])
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

        const defaultDeadlineClauses = buildBetterSwapTransaction(params(TOKEN_A, TOKEN_B), quote)
        assert.strictEqual(defaultDeadlineClauses.length, 2)

        assert.throws(() => buildBetterSwapTransaction(params(TOKEN_A, TOKEN_B), {
            ...quote,
            data: { kind: 'vetrade', clauses: [], path: [] }
        }), /Invalid BetterSwap quote/)
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

        assert.throws(() => encodeApiFunctionCall({
            abi: [],
            args: []
        }), /Function name missing/)
    })

    it('normalizes VeTrade API function definitions from ABI shapes', () => {
        const stateCases = [
            { value: 'pure', constant: true, payable: false },
            { value: 'view', constant: true, payable: false },
            { value: 'constant', constant: false, payable: false },
            { value: 'payable', constant: false, payable: true },
            { value: 'nonpayable', constant: false, payable: false },
            { value: 'weird', constant: false, payable: false }
        ]

        for (const item of stateCases) {
            const normalized = normalizeApiFunctionDefinition({
                name: 'quote',
                abi: [{
                    type: 'function',
                    name: 'quote',
                    stateMutability: item.value
                }],
                args: []
            })

            assert.strictEqual(
                normalized.stateMutability,
                item.value === 'weird' ? 'nonpayable' : item.value
            )
            assert.strictEqual(normalized.constant, item.constant)
            assert.strictEqual(normalized.payable, item.payable)
            assert.deepStrictEqual(normalized.inputs, [])
            assert.deepStrictEqual(normalized.outputs, [])
        }

        const fallback = normalizeApiFunctionDefinition({
            functionName: 'quote',
            abi: [{ name: 'amountIn', type: 'uint256' }],
            args: ['1']
        })

        assert.strictEqual(fallback.name, 'quote')
        assert.strictEqual(fallback.inputs.length, 1)
        assert.strictEqual(fallback.stateMutability, 'nonpayable')
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

        const vetClauses = buildVeTradeTransaction(params('0x', TOKEN_B), quote)
        assert.strictEqual(vetClauses.length, 1)
        assert.strictEqual(vetClauses[0].value, '1000000000000000000')

        assert.throws(() => buildVeTradeTransaction(params(TOKEN_A, TOKEN_B), {
            ...quote,
            data: { kind: 'better-swap', path: [], routerAddress: BETTER_SWAP_ROUTER }
        }), /Invalid VeTrade quote/)
        assert.throws(() => buildVeTradeTransaction(params(TOKEN_A, TOKEN_B), {
            ...quote,
            data: { kind: 'vetrade', path: [], clauses: [] }
        }), /No supported VeTrade clauses/)
        assert.throws(() => buildVeTradeTransaction(params(TOKEN_A, TOKEN_B), {
            ...quote,
            data: { kind: 'vetrade', path: [], clauses: [{ to: '', value: 0, data: '0x' }] }
        }), /No supported VeTrade clauses/)
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
        assert.strictEqual(selectBestQuote([]), null)
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
        assert.deepStrictEqual(buildSwapSigners(null, TOKEN_B), [])
        assert.deepStrictEqual(buildSwapSigners(wallet, ''), [])
    })

    it('simulates swap clauses and reports failure reasons', async () => {
        const quote = betterQuote('0x', '0x')
        const clause = { to: BETTER_SWAP_ROUTER, value: '100', data: '0x' }

        assert.deepStrictEqual(
            await simulateSwapWithClauses(params('0x', '0x'), quote, [], thorWithOutputs([])),
            { gasCostVTHO: 0, success: false, error: 'No swap clauses' }
        )

        assert.deepStrictEqual(
            await simulateSwapWithClauses(
                { ...params('0x', '0x'), amountIn: '100' },
                { ...quote, minimumOutputAmount: '90' },
                [clause],
                thorWithOutputs([output({
                    transfers: [{ sender: BETTER_SWAP_ROUTER, recipient: USER, amount: '95' }],
                    gasUsed: 1000
                })])
            ),
            { gasCostVTHO: 2.01, success: true, error: '' }
        )

        assert.strictEqual(
            (await simulateSwapWithClauses(
                { ...params('0x', '0x'), amountIn: '100' },
                { ...quote, minimumOutputAmount: '90' },
                [{ ...clause, value: '101' }],
                thorWithOutputs([output({ transfers: [{ sender: BETTER_SWAP_ROUTER, recipient: USER, amount: '95' }] })])
            )).error,
            'Unexpected VET outflow'
        )

        assert.strictEqual(
            (await simulateSwapWithClauses(
                { ...params('0x', '0x'), amountIn: '100' },
                { ...quote, minimumOutputAmount: '90' },
                [clause],
                thorWithOutputs([output({ reverted: true, revertReason: 'bad swap' })])
            )).error,
            'bad swap'
        )

        assert.strictEqual(
            (await simulateSwapWithClauses(
                { ...params('0x', '0x'), amountIn: '100' },
                { ...quote, minimumOutputAmount: '90' },
                [clause],
                thorWithOutputs([output({ reverted: true, revertReason: '', vmError: 'vm fail' })])
            )).error,
            'vm fail'
        )

        assert.strictEqual(
            (await simulateSwapWithClauses(
                { ...params('0x', '0x'), amountIn: '100' },
                { ...quote, minimumOutputAmount: '90' },
                [clause],
                thorWithOutputs([output({ reverted: true, revertReason: '', vmError: '' })])
            )).error,
            'Transaction reverted'
        )

        assert.deepStrictEqual(
            await simulateSwapWithClauses(
                { ...params('0x', '0x'), amountIn: '100' },
                quote,
                [clause],
                thorRejectingSimulation('bad')
            ),
            { gasCostVTHO: 0, success: false, error: 'Simulation failed' }
        )
    })

    it('simulates token transfer logs and rejects unsafe token flows', async () => {
        const quote = betterQuote(TOKEN_A, TOKEN_B)
        const clause = { to: BETTER_SWAP_ROUTER, value: '', data: '0x' }

        assert.deepStrictEqual(
            await simulateSwapWithClauses(
                { ...params(TOKEN_A, TOKEN_B), amountIn: '100' },
                { ...quote, minimumOutputAmount: '90' },
                [clause],
                thorWithOutputs([output({
                    events: [
                        transferLog(TOKEN_A, USER, BETTER_SWAP_ROUTER, '100'),
                        transferLog(TOKEN_B, BETTER_SWAP_ROUTER, USER, '95'),
                        transferLog(TOKEN_A, BETTER_SWAP_ROUTER, TOKEN_B, '3'),
                        { address: TOKEN_A, topics: [], data: '0x' } as Connex.VM.Event
                    ],
                    transfers: [{ sender: BETTER_SWAP_ROUTER, recipient: TOKEN_A, amount: '1000' }]
                })])
            ),
            { gasCostVTHO: 2.01, success: true, error: '' }
        )

        assert.strictEqual(
            (await simulateSwapWithClauses(
                { ...params(TOKEN_A, TOKEN_B), amountIn: '100' },
                { ...quote, minimumOutputAmount: '0' },
                [clause],
                thorWithOutputs([output({
                    events: [transferLog(TOKEN_B, USER, BETTER_SWAP_ROUTER, '1')]
                })])
            )).error,
            'Unexpected token outflow'
        )

        assert.strictEqual(
            (await simulateSwapWithClauses(
                { ...params(TOKEN_A, TOKEN_B), amountIn: '100' },
                { ...quote, minimumOutputAmount: '200' },
                [clause],
                thorWithOutputs([output({
                    events: [
                        transferLog(TOKEN_A, USER, BETTER_SWAP_ROUTER, '100'),
                        transferLog(TOKEN_B, BETTER_SWAP_ROUTER, USER, '100')
                    ]
                })])
            )).error,
            'Expected at least 200 out'
        )
    })

    it('aggregates quotes and selects the best successful simulation', async () => {
        const originalWarn = console.warn
        const aggregators: SwapAggregator[] = [
            {
                name: 'zero',
                getQuote: () => Promise.resolve({ ...betterQuote(TOKEN_A, TOKEN_B), outputAmount: '0' }),
                simulateSwap: () => Promise.reject(new Error('unused')),
                buildSwapTransaction: () => Promise.resolve([])
            },
            {
                name: 'best',
                getQuote: () => Promise.resolve({ ...betterQuote(TOKEN_A, TOKEN_B), outputAmount: '20' }),
                simulateSwap: () => Promise.resolve({ gasCostVTHO: 2, success: true, error: '' }),
                buildSwapTransaction: () => Promise.resolve([])
            },
            {
                name: 'failed',
                getQuote: () => Promise.reject(new Error('down')),
                simulateSwap: () => Promise.reject(new Error('unused')),
                buildSwapTransaction: () => Promise.resolve([])
            }
        ]

        console.warn = () => {}
        try {
            const result = await getSwapQuotes(params(TOKEN_A, TOKEN_B), thorWithOutputs([]), aggregators)

            assert.strictEqual(result.quotes.length, 1)
            assert.strictEqual(result.bestQuote!.aggregator.name, 'best')
            assert.strictEqual(result.bestQuote!.gasCostVTHO, 2)
        } finally {
            console.warn = originalWarn
        }
    })

    it('creates aggregators for supported swap networks only', () => {
        assert.deepStrictEqual(getSwapAggregators('unsupported'), [])
        assert.deepStrictEqual(getSwapAggregators('main').map(aggregator => aggregator.name), [
            'VeTrade.vet',
            'BetterSwap.io'
        ])
    })

    it('fetches BetterSwap quotes from router output', async () => {
        const aggregator = createBetterSwapAggregator()
        const callArgs: unknown[] = []
        const thor = {
            account: (address: string) => {
                assert.strictEqual(address, BETTER_SWAP_ROUTER)
                return {
                    method: (definition: typeof getAmountsOutABI) => {
                        assert.strictEqual(definition.name, 'getAmountsOut')
                        return {
                            call: (...args: unknown[]) => {
                                callArgs.push(...args)
                                return Promise.resolve({
                                    decoded: {
                                        amounts: ['100', '250']
                                    }
                                })
                            }
                        }
                    }
                }
            }
        } as unknown as Connex.Thor

        const quote = await aggregator.getQuote(params('0x', TOKEN_A), thor)

        assert.deepStrictEqual(callArgs, ['1000000000000000000', [BETTER_SWAP_WVET, TOKEN_A]])
        assert.strictEqual(quote.outputAmount, '250')
        assert.strictEqual(quote.minimumOutputAmount, '247')
        assert.strictEqual(quote.data.kind, 'better-swap')

        callArgs.length = 0
        const vetQuote = await aggregator.getQuote(params(TOKEN_A, '0x'), thor)
        assert.deepStrictEqual(callArgs, ['1000000000000000000', [TOKEN_A, BETTER_SWAP_WVET]])
        assert.strictEqual(vetQuote.outputAmount, '250')
    })

    it('handles empty BetterSwap router outputs', async () => {
        const aggregator = createBetterSwapAggregator()
        const decodedOutputs: Array<Record<string | number, unknown>> = [
            {},
            { amounts: [] },
            { amounts: ['100', { value: 'bad' }] },
            { 0: [100, 250] }
        ]
        const thor = {
            account: () => ({
                method: () => ({
                    call: () => Promise.resolve({
                        decoded: decodedOutputs.shift() || {}
                    })
                })
            })
        } as unknown as Connex.Thor

        assert.strictEqual((await aggregator.getQuote(params(TOKEN_A, TOKEN_B), thor)).outputAmount, '0')
        assert.strictEqual((await aggregator.getQuote(params(TOKEN_A, TOKEN_B), thor)).outputAmount, '0')
        assert.strictEqual((await aggregator.getQuote(params(TOKEN_A, TOKEN_B), thor)).outputAmount, '0')
        assert.strictEqual((await aggregator.getQuote(params(TOKEN_A, TOKEN_B), thor)).outputAmount, '250')
    })

    it('returns reverted BetterSwap quotes on router failure', async () => {
        const originalWarn = console.warn
        const aggregator = createBetterSwapAggregator()
        const thor = {
            account: () => ({
                method: () => ({
                    call: () => Promise.reject(new Error('router down'))
                })
            })
        } as unknown as Connex.Thor

        console.warn = () => {}
        try {
            const quote = await aggregator.getQuote(params(TOKEN_A, TOKEN_B), thor)

            assert.strictEqual(quote.reverted, true)
            assert.strictEqual(quote.outputAmount, '0')
            assert.strictEqual(quote.revertReason, 'router down')

            const nonErrorThor = {
                account: () => ({
                    method: () => ({
                        call: () => Promise.reject('router down')
                    })
                })
            } as unknown as Connex.Thor
            const nonError = await aggregator.getQuote(params(TOKEN_A, TOKEN_B), nonErrorThor)
            assert.strictEqual(nonError.revertReason, 'Quote failed')
        } finally {
            console.warn = originalWarn
        }
    })

    it('fetches VeTrade quotes and handles quote failures', async () => {
        const originalGet = axios.get
        const originalWarn = console.warn
        const aggregator = createVeTradeAggregator()
        const swapFunc = new abi.Function(swapExactTokensForTokensABI)

        console.warn = () => {}
        axios.get = ((url: string, options?: unknown) => {
            assert.strictEqual(url, 'https://vetrade.vet/api/quote/vck')
            assert.deepStrictEqual((options as { params: Record<string, string> }).params, {
                fromAddress: TOKEN_A,
                toAddress: TOKEN_B,
                amountIn: '1000000000000000000',
                recipient: USER,
                slippageBps: '100',
                network: 'main'
            })

            return Promise.resolve({
                data: {
                    amountOut: '300',
                    amountOutMin: '290',
                    path: [TOKEN_A, TOKEN_B],
                    clauses: [{
                        to: VETRADE_SUPPORTED_ADDRESSES[0],
                        value: '0',
                        functionCall: {
                            name: 'swapExactTokensForTokens',
                            abi: [swapExactTokensForTokensABI],
                            args: ['1', '2', [TOKEN_A, TOKEN_B], USER, '123']
                        }
                    }]
                }
            })
        }) as typeof axios.get

        try {
            const quote = await aggregator.getQuote(params(TOKEN_A, TOKEN_B), thorWithOutputs([]))

            assert.strictEqual(quote.outputAmount, '300')
            assert.strictEqual(quote.minimumOutputAmount, '290')
            assert.strictEqual(quote.data.kind, 'vetrade')
            assert.strictEqual(quote.data.clauses[0].data, swapFunc.encode('1', '2', [TOKEN_A, TOKEN_B], USER, '123'))

            axios.get = (() => Promise.reject(new Error('api down'))) as typeof axios.get
            const failed = await aggregator.getQuote(params(TOKEN_A, TOKEN_B), thorWithOutputs([]))
            assert.strictEqual(failed.reverted, true)
            assert.strictEqual(failed.revertReason, 'api down')

            axios.get = (() => Promise.resolve({
                data: {
                    clauses: [{
                        to: VETRADE_SUPPORTED_ADDRESSES[0],
                        value: '',
                        functionCall: {
                            functionName: 'swapExactTokensForTokens',
                            abi: [swapExactTokensForTokensABI],
                            args: ['1', '2', [TOKEN_A, TOKEN_B], USER, '123']
                        }
                    }]
                }
            })) as typeof axios.get
            const fallbackQuote = await aggregator.getQuote(params(TOKEN_A, TOKEN_B), thorWithOutputs([]))
            assert.strictEqual(fallbackQuote.outputAmount, '0')
            assert.strictEqual(fallbackQuote.minimumOutputAmount, '0')
            assert.deepStrictEqual(fallbackQuote.data.path, [])

            axios.get = (() => Promise.reject('api down')) as typeof axios.get
            const nonError = await aggregator.getQuote(params(TOKEN_A, TOKEN_B), thorWithOutputs([]))
            assert.strictEqual(nonError.reverted, true)
            assert.strictEqual(nonError.revertReason, 'Quote failed')
        } finally {
            axios.get = originalGet
            console.warn = originalWarn
        }
    })
})
