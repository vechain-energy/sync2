/* eslint-env mocha */
import * as assert from 'assert'
import { presetNodes } from '../src/boot/services/config/preset-nodes'
import { genesises, urls } from '../src/consts'

describe('config node presets', () => {
    it('uses only official VeChain public nodes', () => {
        assert.deepStrictEqual(
            presetNodes.map(node => ({ gid: node.genesis.id, url: node.url })),
            [
                { gid: genesises.main.id, url: 'https://mainnet.vechain.org' },
                { gid: genesises.test.id, url: 'https://testnet.vechain.org' }
            ]
        )
        assert.strictEqual(presetNodes.every(node => node.preset), true)
    })

    it('uses VeChainStats as mainnet transaction explorer', () => {
        assert.strictEqual(`${urls.explorerMain}transactions/{txid}`, 'https://vechainstats.com/transactions/{txid}')
        assert.strictEqual(urls.explorerTest, 'https://explore-testnet.vechain.org/')
    })
})
