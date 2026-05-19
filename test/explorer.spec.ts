/* eslint-env mocha */
import * as assert from 'assert'
import { genesises } from '../src/consts'
import { txExplorerUrl } from '../src/utils/explorer'

describe('explorer helpers', () => {
    it('builds transaction explorer URLs for supported networks', () => {
        assert.strictEqual(
            txExplorerUrl(genesises.main.id, '0xabc'),
            'https://vechainstats.com/transactions/0xabc'
        )
        assert.strictEqual(
            txExplorerUrl(genesises.test.id, '0xabc'),
            'https://explore-testnet.vechain.org/transactions/0xabc'
        )
    })

    it('returns no explorer URL for unsupported networks', () => {
        assert.strictEqual(txExplorerUrl('0x00', '0xabc'), '')
    })
})
