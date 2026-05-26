/* eslint-env mocha */
import * as assert from 'assert'
import axios from 'axios'
import { TokenRegistry } from '../src/boot/services/config/token-registry'

describe('token registry helpers', () => {
    it('normalizes malformed registry payloads', () => {
        const token = {
            name: 'Token',
            symbol: 'TOK',
            decimals: 18,
            address: '0x0000000000000000000000000000000000000001',
            icon: 'tok.png',
            iconSrc: 'https://example.com/tok.png'
        }

        assert.deepStrictEqual(TokenRegistry.normalize({
            updated: 12,
            main: [token, { symbol: 'BAD' }],
            test: [{ ...token, decimals: Number.NaN }]
        }), {
            updated: 12,
            main: [token],
            test: []
        })
        assert.deepStrictEqual(TokenRegistry.normalize(null), {
            updated: 0,
            main: [],
            test: []
        })
    })

    it('fetches registry networks and drops built-in VTHO entries', async () => {
        const originalGet = axios.get
        const calls: string[] = []
        const token = {
            name: 'Token',
            symbol: 'TOK',
            decimals: 18,
            address: '0x0000000000000000000000000000000000000001',
            icon: 'tok.png'
        }

        axios.get = ((url: string, options?: unknown) => {
            calls.push(url)
            assert.strictEqual((options as { timeout?: number }).timeout, 30000)

            return Promise.resolve({
                data: JSON.stringify([
                    token,
                    { ...token, symbol: 'VTHO' },
                    { symbol: 'BAD' }
                ])
            })
        }) as typeof axios.get

        try {
            const registry = await TokenRegistry.fetch()

            assert.deepStrictEqual(calls, [
                'https://vechain.github.io/token-registry/main.json',
                'https://vechain.github.io/token-registry/test.json'
            ])
            assert.strictEqual(registry.updated > 0, true)
            assert.deepStrictEqual(registry.main, [token])
            assert.deepStrictEqual(registry.test, [token])
        } finally {
            axios.get = originalGet
        }
    })

    it('builds token icon URLs', () => {
        assert.strictEqual(
            TokenRegistry.iconSrc('icons/token.png'),
            'https://vechain.github.io/token-registry/assets/icons/token.png'
        )
    })
})
