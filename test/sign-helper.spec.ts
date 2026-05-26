/* eslint-env mocha */
import * as assert from 'assert'
import { Transaction } from 'thor-devkit'
import { calcBufferedGas, calcExplainGas, estimateGas } from '../src/pages/Sign/helper'

type CapturedGas = {
    gas: number
}

type FakeExplainer = {
    caller: (caller: string) => FakeExplainer
    gas: (gas: number) => FakeExplainer
    execute: () => Promise<Connex.VM.Output[]>
}

const caller = `0x${'1'.repeat(40)}`
const claimLikeTransactionClause = {
    to: `0x${'2'.repeat(40)}`,
    value: '0',
    data: `0x0962ef79${'0'.repeat(64)}`
}
const claimLikeClause: Connex.VM.Clause = claimLikeTransactionClause

function fakeOutput(gasUsed: number, reverted = false): Connex.VM.Output {
    return {
        data: '0x',
        events: [],
        transfers: [],
        gasUsed,
        reverted,
        vmError: reverted ? 'execution reverted' : ''
    }
}

function fakeThor(captured: CapturedGas, outputs: Connex.VM.Output[]): Connex.Thor {
    const explainer: FakeExplainer = {
        caller: () => explainer,
        gas: (gas: number) => {
            captured.gas = gas
            return explainer
        },
        execute: () => Promise.resolve(outputs)
    }

    return {
        explain: () => explainer,
        fees: {
            history: () => ({
                count: () => ({
                    get: () => Promise.resolve({ baseFeePerGas: ['0x1'] })
                })
            }),
            priorityFee: () => Promise.resolve('0x1')
        },
        status: {
            head: {
                baseFeePerGas: '0x1'
            }
        }
    } as unknown as Connex.Thor
}

describe('sign helper gas estimation', () => {
    it('simulates dapp-provided gas with a safety buffer without subtracting intrinsic gas', async () => {
        const suggestedGas = 1037016
        const intrinsicGas = Transaction.intrinsicGas([claimLikeTransactionClause])
        const bufferedGas = calcBufferedGas(suggestedGas)
        const captured = { gas: 0 }

        const result = await estimateGas(
            fakeThor(captured, [fakeOutput(1000488)]),
            [claimLikeClause],
            suggestedGas,
            caller
        )

        assert.strictEqual(bufferedGas, 1140718)
        assert.strictEqual(calcExplainGas(suggestedGas), bufferedGas)
        assert.notStrictEqual(captured.gas, suggestedGas - intrinsicGas)
        assert.strictEqual(captured.gas, bufferedGas)
        assert.strictEqual(result.gas, bufferedGas)
        assert.strictEqual(result.reverted, false)
    })

    it('can keep provided gas unbuffered when external fee estimates must match', async () => {
        const suggestedGas = 1037016
        const captured = { gas: 0 }

        const result = await estimateGas(
            fakeThor(captured, [fakeOutput(1000488)]),
            [claimLikeClause],
            suggestedGas,
            caller,
            undefined,
            false
        )

        assert.strictEqual(calcExplainGas(suggestedGas, false), suggestedGas)
        assert.strictEqual(captured.gas, suggestedGas)
        assert.strictEqual(result.gas, suggestedGas)
    })

    it('keeps intrinsic padding when Sync2 estimates missing gas', async () => {
        const captured = { gas: 0 }
        const gasUsed = 1000488
        const intrinsicGas = Transaction.intrinsicGas([claimLikeTransactionClause])

        const result = await estimateGas(
            fakeThor(captured, [fakeOutput(gasUsed)]),
            [claimLikeClause],
            0,
            caller
        )

        assert.strictEqual(captured.gas, calcExplainGas(0))
        assert.strictEqual(result.gas, calcBufferedGas(intrinsicGas + gasUsed + 15000))
    })
})
