/* eslint-env mocha */
import * as assert from 'assert'
import { parseStoredJson } from '../src/utils/json'

describe('config JSON helpers', () => {
    it('returns parsed stored JSON values', () => {
        assert.deepStrictEqual(parseStoredJson('["VET"]', [] as string[]), ['VET'])
    })

    it('falls back for empty or malformed stored JSON values', () => {
        assert.deepStrictEqual(parseStoredJson('', [] as string[]), [])
        assert.deepStrictEqual(parseStoredJson('not-json', [] as string[]), [])
    })

    it('supports nullable stored objects', () => {
        const fallback = null as { name: string } | null
        assert.deepStrictEqual(parseStoredJson('{"name":"transfer"}', fallback), { name: 'transfer' })
        assert.strictEqual(parseStoredJson('not-json', fallback), null)
    })
})
