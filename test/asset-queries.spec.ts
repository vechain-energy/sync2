/* eslint-env mocha */
import * as assert from 'assert'
import { abi } from 'thor-devkit'
import { tokenTransfers } from '../src/pages/Asset/queries'

type TransferDecode = {
    _from: string
    _to: string
    _value: string
}

const USER = '0xAa00000000000000000000000000000000000000'
const USER_LOWER = USER.toLowerCase()
const OTHER = '0xbb00000000000000000000000000000000000000'
const TOKEN: M.TokenSpec = {
    gid: 'main',
    name: 'Token',
    symbol: 'TOK',
    decimals: 18,
    address: '0xCc00000000000000000000000000000000000000',
    iconSrc: '',
    permanent: false
}

function eventRow(address: string): Connex.Thor.Filter.Row<'event'> {
    return {
        address,
        topics: [],
        data: '0x',
        meta: {
            blockID: `0x${'1'.repeat(64)}`,
            blockNumber: 1,
            blockTimestamp: 1,
            txID: `0x${'2'.repeat(64)}`,
            txOrigin: USER,
            clauseIndex: 0
        }
    } as Connex.Thor.Filter.Row<'event'>
}

function thorWithEventRows(rows: Connex.Thor.Filter.Row<'event'>[]): Connex.Thor {
    return {
        account: () => ({
            event: () => ({
                asCriteria: () => ({})
            })
        }),
        filter: () => ({
            order: () => ({
                range: () => ({
                    cache: () => ({
                        apply: async () => rows
                    })
                })
            })
        })
    } as unknown as Connex.Thor
}

describe('asset transfer queries', () => {
    it('marks token transfer direction with mixed-case addresses', async () => {
        const eventPrototype = abi.Event.prototype as unknown as {
            decode: (data: string, topics: string[]) => TransferDecode
        }
        const originalDecode = eventPrototype.decode
        const decoded: TransferDecode[] = [
            { _from: USER_LOWER, _to: OTHER, _value: '10' },
            { _from: OTHER, _to: USER_LOWER, _value: '20' }
        ]

        eventPrototype.decode = () => decoded.shift() || { _from: OTHER, _to: OTHER, _value: '0' }
        try {
            const logs = await tokenTransfers(
                thorWithEventRows([eventRow(TOKEN.address.toLowerCase()), eventRow(TOKEN.address.toUpperCase())]),
                [TOKEN],
                USER,
                0,
                10,
                0,
                10
            )

            assert.deepStrictEqual(logs.map(item => item.direction), ['-', '+'])
            assert.deepStrictEqual(logs.map(item => item.amount), ['10', '20'])
            assert.ok(logs.every(item => item.token.symbol === TOKEN.symbol))
        } finally {
            eventPrototype.decode = originalDecode
        }
    })
})
