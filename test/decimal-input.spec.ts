/* eslint-env mocha */
import * as assert from 'assert'
import { sanitizeDecimalInput } from '../src/utils/decimal-input'

describe('decimal input helpers', () => {
    it('keeps only digits and one decimal separator', () => {
        assert.strictEqual(sanitizeDecimalInput('1.2.3abc4'), '1.234')
        assert.strictEqual(sanitizeDecimalInput('..12'), '.12')
        assert.strictEqual(sanitizeDecimalInput('VET 10.5'), '10.5')
    })

    it('limits decimal places when requested', () => {
        assert.strictEqual(sanitizeDecimalInput('1.2345', 2), '1.23')
        assert.strictEqual(sanitizeDecimalInput('123.45', 0), '123.')
    })
})
