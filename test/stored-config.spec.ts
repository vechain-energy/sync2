/* eslint-env mocha */
import * as assert from 'assert'
import { genesises } from '../src/consts'
import {
    parseStoredNodes,
    parseStoredStringArray,
    parseStoredStringMap,
    parseStoredTokenRegistry
} from '../src/boot/services/config/stored-config'

describe('stored config guards', () => {
    it('filters malformed saved nodes before appending them to preset nodes', () => {
        const node = { genesis: genesises.main, url: 'https://custom.example' }

        assert.deepStrictEqual(parseStoredNodes(JSON.stringify([node, {}, { genesis: {}, url: 'https://bad.example' }, 'bad'])), [node])
        assert.deepStrictEqual(parseStoredNodes('{"genesis":{"id":"0x0"},"url":"https://bad.example"}'), [])
    })

    it('filters stored string arrays and maps', () => {
        assert.deepStrictEqual(parseStoredStringArray('["VET",1,null,"B3TR"]'), ['VET', 'B3TR'])
        assert.deepStrictEqual(parseStoredStringArray('{"symbol":"VET"}'), [])
        assert.deepStrictEqual(parseStoredStringMap('{"main":"https://node.example","bad":1,"nested":{}}'), {
            main: 'https://node.example'
        })
    })

    it('normalizes malformed token registry data from older installs', () => {
        const validToken = {
            name: 'Token',
            symbol: 'TOK',
            decimals: 18,
            address: '0x0000000000000000000000000000000000000001',
            icon: 'tok.png'
        }

        assert.deepStrictEqual(parseStoredTokenRegistry(JSON.stringify({
            updated: 123,
            main: [validToken, { symbol: 'BAD' }],
            test: 'bad'
        })), {
            updated: 123,
            main: [validToken],
            test: []
        })
        assert.deepStrictEqual(parseStoredTokenRegistry('{"updated":"bad","main":{},"test":null}'), {
            updated: 0,
            main: [],
            test: []
        })
    })
})
