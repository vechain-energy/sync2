/* eslint-env mocha */
import * as assert from 'assert'
import { Transaction } from 'thor-devkit'
import { BigNumber } from 'bignumber.js'
import {
    FeePriority,
    buildDynamicFeeTxBody,
    calcCurrentFee,
    calcMaxFee,
    calcMaxFeePerGas,
    calcPriorityFeePerGas
} from '../src/pages/Sign/fee-market'

describe('fee market helpers', () => {
    it('calculates regular, medium, and high priority fees', () => {
        assert.strictEqual(calcPriorityFeePerGas('0xa', FeePriority.Regular).toString(), '10')
        assert.strictEqual(calcPriorityFeePerGas('0xa', FeePriority.Medium).toString(), '15')
        assert.strictEqual(calcPriorityFeePerGas('0xa', FeePriority.High).toString(), '20')
    })

    it('calculates current fee and max cap', () => {
        const priorityFeePerGas = calcPriorityFeePerGas('0xa', FeePriority.Regular)
        const maxFeePerGas = calcMaxFeePerGas('0x64', priorityFeePerGas)

        assert.strictEqual(calcCurrentFee(21000, '0x64', priorityFeePerGas).toString(), '2310000')
        assert.strictEqual(maxFeePerGas.toString(), '210')
        assert.strictEqual(calcMaxFee(21000, maxFeePerGas).toString(), '4410000')
    })

    it('builds dynamic fee transaction bodies only', () => {
        const body = buildDynamicFeeTxBody(
            '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a',
            '0x017b6e328c3e15b0d24376289af68e70326fbb37b339a341e06c3d000fb17ff3',
            [{
                to: '0x0000000000000000000000000000000000000001',
                value: '1',
                data: '0x'
            }],
            21000,
            new BigNumber(10),
            new BigNumber(210),
            undefined,
            '0x01'
        )

        assert.strictEqual(body.type, Transaction.Type.DynamicFee)
        assert.strictEqual(body.maxPriorityFeePerGas, '0xa')
        assert.strictEqual(body.maxFeePerGas, '0xd2')
        assert.strictEqual(Object.prototype.hasOwnProperty.call(body, 'gasPriceCoef'), false)
        assert.strictEqual(new Transaction(body).encode()[0], 0x51)
    })
})
