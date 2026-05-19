/* eslint-env mocha */
import * as assert from 'assert'
import { genesises } from '../src/consts'
import { buildSignerGroups } from '../src/pages/Sign/signer-groups'

const wallet: M.Wallet = {
    id: 1,
    gid: genesises.main.id,
    vault: '',
    meta: {
        name: 'Wallet',
        type: 'hd',
        addresses: [
            '0x1111111111111111111111111111111111111111',
            '0x2222222222222222222222222222222222222222'
        ]
    }
}

const otherWallet: M.Wallet = {
    id: 2,
    gid: genesises.main.id,
    vault: '',
    meta: {
        name: 'Other',
        type: 'hd',
        addresses: ['0x3333333333333333333333333333333333333333']
    }
}

describe('signer groups', () => {
    it('limits selectable signers without enforcing one signer', () => {
        const groups = buildSignerGroups([wallet, otherWallet], undefined, [
            wallet.meta.addresses[1],
            wallet.meta.addresses[0]
        ])

        assert.deepStrictEqual(groups, [{
            name: 'Wallet',
            addresses: [wallet.meta.addresses[1], wallet.meta.addresses[0]]
        }])
    })

    it('keeps existing enforced signer behavior', () => {
        const groups = buildSignerGroups([wallet], wallet.meta.addresses[0], [
            wallet.meta.addresses[1]
        ])

        assert.deepStrictEqual(groups, [{
            name: 'Wallet',
            addresses: [wallet.meta.addresses[0]]
        }])
    })
})
