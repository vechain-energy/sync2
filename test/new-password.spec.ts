/* eslint-env mocha */
import * as assert from 'assert'
import { validateNewPasswordInput } from '../src/utils/new-password'

describe('new password helpers', () => {
    it('rejects empty and short new passwords', () => {
        assert.strictEqual(validateNewPasswordInput(''), 'too-short')
        assert.strictEqual(validateNewPasswordInput('12345'), 'too-short')
    })

    it('accepts passwords with the minimum length', () => {
        assert.strictEqual(validateNewPasswordInput('123456'), '')
    })

    it('rejects mismatched confirmation values', () => {
        assert.strictEqual(validateNewPasswordInput('', '123456'), 'mismatch')
        assert.strictEqual(validateNewPasswordInput('654321', '123456'), 'mismatch')
        assert.strictEqual(validateNewPasswordInput('123456', '123456'), '')
    })
})
