/* eslint-env mocha */
import * as assert from 'assert'
import { formatAmount, formatDate, rawTokenAmountToInput, toWei } from '../src/utils/format'

describe('format helpers', () => {
    it('formats finite token amounts with units and fixed precision', () => {
        assert.deepStrictEqual(formatAmount('1234500', { unit: 4, fixed: 2 }), {
            int: '123',
            dec: '45',
            sep: '.'
        })
        assert.deepStrictEqual(formatAmount('1000', { unit: 3, fixed: 3, fullPrecision: true }), {
            int: '1',
            dec: '000',
            sep: '.'
        })
        assert.deepStrictEqual(formatAmount('1201', { unit: 3, fixed: 4, fullPrecision: true }), {
            int: '1',
            dec: '2010',
            sep: '.'
        })
        assert.deepStrictEqual(formatAmount('1234', { unit: 3, fixed: 2, fullPrecision: true }), {
            int: '1',
            dec: '234',
            sep: '.'
        })
        assert.deepStrictEqual(formatAmount('1201', { unit: 3, fullPrecision: true }), {
            int: '1',
            dec: '201',
            sep: '.'
        })
        assert.deepStrictEqual(formatAmount('1201', { unit: 3 }), {
            int: '1',
            dec: '201',
            sep: '.'
        })
    })

    it('rejects invalid amount input and converts decimal strings to wei', () => {
        assert.strictEqual(formatAmount('not-a-number'), null)
        assert.strictEqual(formatAmount('Infinity'), null)
        assert.strictEqual(toWei('1.2345', 3), '1234')
    })

    it('converts raw token balances to full precision input strings', () => {
        assert.strictEqual(rawTokenAmountToInput('1000000000000000000', 18), '1')
        assert.strictEqual(rawTokenAmountToInput('123450000', 6), '123.45')
        assert.strictEqual(rawTokenAmountToInput('1', 18), '0.000000000000000001')
        assert.strictEqual(rawTokenAmountToInput('0', 18), '0')
        assert.strictEqual(rawTokenAmountToInput('1000', 0), '1000')
        assert.strictEqual(rawTokenAmountToInput('not-a-number', 18), '0')
    })

    it('formats relative dates only inside the relative window', () => {
        assert.match(formatDate(Date.now() + 30 * 60 * 1000, { relative: true }), /30 minutes/)
        assert.match(formatDate(Date.now() - 2 * 60 * 60 * 1000, { relative: true }), /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)
        assert.match(formatDate(Date.now()), /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)
    })
})
