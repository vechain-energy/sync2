/* eslint-env mocha */
import * as assert from 'assert'
import { normalizeLedgerSignature } from '../src/utils/ledger-signature'

describe('ledger signature helpers', () => {
    it('keeps Buffer signatures usable by thor-devkit', () => {
        const signature = Buffer.alloc(65, 1)

        assert.strictEqual(normalizeLedgerSignature(signature), signature)
    })

    it('normalizes Uint8Array signatures returned by Ledger transports', () => {
        const source = new Uint8Array(66)
        source.fill(2)
        const signature = source.subarray(1)

        const normalized = normalizeLedgerSignature(signature)

        assert.strictEqual(Buffer.isBuffer(normalized), true)
        assert.strictEqual(normalized.length, 65)
        assert.strictEqual(normalized[0], 2)
    })

    it('normalizes serialized Buffer signatures from dialog boundaries', () => {
        const normalized = normalizeLedgerSignature({
            type: 'Buffer',
            data: Array.from(Buffer.alloc(65, 3))
        })

        assert.strictEqual(Buffer.isBuffer(normalized), true)
        assert.strictEqual(normalized.length, 65)
        assert.strictEqual(normalized[0], 3)
    })

    it('rejects malformed Ledger signatures with an actionable error', () => {
        assert.throws(
            () => normalizeLedgerSignature(new Uint8Array(64)),
            /reconnect Ledger/
        )
    })
})
