/* eslint-env mocha */
import * as assert from 'assert'
import { parseStoredNonNegativeInteger } from '../src/utils/storage'

describe('storage helpers', () => {
    it('parses stored non-negative integers', () => {
        assert.strictEqual(parseStoredNonNegativeInteger('0'), 0)
        assert.strictEqual(parseStoredNonNegativeInteger('42'), 42)
    })

    it('falls back for missing or malformed stored integers', () => {
        assert.strictEqual(parseStoredNonNegativeInteger(null), 0)
        assert.strictEqual(parseStoredNonNegativeInteger('', 7), 7)
        assert.strictEqual(parseStoredNonNegativeInteger('12bad', 7), 7)
        assert.strictEqual(parseStoredNonNegativeInteger('-1', 7), 7)
        assert.strictEqual(parseStoredNonNegativeInteger('9007199254740992', 7), 7)
    })
})
