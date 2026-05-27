/* eslint-env mocha */
import * as assert from 'assert'
import { genesises } from '../src/consts'
import { buildSignerGroups, selectSigner } from '../src/pages/Sign/signer-groups'

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

const smartAccount: M.SmartAccount = {
    address: '0x4444444444444444444444444444444444444444',
    owner: wallet.meta.addresses[0],
    walletId: wallet.id,
    gid: wallet.gid,
    version: 3,
    salt: '0',
    source: 'default',
    deployed: true
}

describe('signer groups', () => {
    it('limits selectable signers without enforcing one signer', () => {
        const groups = buildSignerGroups([wallet, otherWallet], undefined, [
            otherWallet.meta.addresses[0],
            wallet.meta.addresses[1],
            wallet.meta.addresses[0],
            wallet.meta.addresses[0].toUpperCase(),
            '0x9999999999999999999999999999999999999999'
        ])

        assert.deepStrictEqual(groups, [
            {
                name: 'Other',
                addresses: [otherWallet.meta.addresses[0]]
            },
            {
                name: 'Wallet',
                addresses: [wallet.meta.addresses[1], wallet.meta.addresses[0]]
            }
        ])
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

    it('preselects preferred signer without enforcing it', () => {
        const groups = buildSignerGroups([wallet, otherWallet], undefined, [
            wallet.meta.addresses[0],
            wallet.meta.addresses[1]
        ])

        assert.strictEqual(
            selectSigner(groups, wallet.meta.addresses[1], wallet.meta.addresses[0].toUpperCase()),
            wallet.meta.addresses[0]
        )
        assert.strictEqual(
            selectSigner(groups, wallet.meta.addresses[1]),
            wallet.meta.addresses[1]
        )
    })

    it('returns all wallets when signers are unrestricted and falls back safely', () => {
        assert.deepStrictEqual(buildSignerGroups([wallet, otherWallet]), [
            {
                name: 'Wallet',
                addresses: wallet.meta.addresses
            },
            {
                name: 'Other',
                addresses: otherWallet.meta.addresses
            }
        ])
        assert.deepStrictEqual(buildSignerGroups([wallet], '0x9999999999999999999999999999999999999999'), [{
            name: '',
            addresses: ['0x9999999999999999999999999999999999999999']
        }])
        const changingAddresses = [wallet.meta.addresses[0]]
        changingAddresses.find = () => undefined
        assert.deepStrictEqual(buildSignerGroups([{
            ...wallet,
            meta: {
                ...wallet.meta,
                addresses: changingAddresses
            }
        }], undefined, [wallet.meta.addresses[0]]), [])
        assert.strictEqual(selectSigner([], wallet.meta.addresses[0]), '')
        assert.strictEqual(selectSigner(buildSignerGroups([wallet]), otherWallet.meta.addresses[0]), wallet.meta.addresses[0])
    })

    it('adds smart accounts under their owner wallet for transaction signer groups', () => {
        assert.deepStrictEqual(buildSignerGroups([wallet], undefined, undefined, [smartAccount]), [{
            name: 'Wallet',
            addresses: [...wallet.meta.addresses, smartAccount.address]
        }])
    })

    it('matches signer restrictions against smart accounts', () => {
        assert.deepStrictEqual(buildSignerGroups([wallet], undefined, [smartAccount.address.toUpperCase()], [smartAccount]), [{
            name: 'Wallet',
            addresses: [smartAccount.address]
        }])
        assert.deepStrictEqual(buildSignerGroups([wallet], smartAccount.address.toUpperCase(), [], [smartAccount]), [{
            name: 'Wallet',
            addresses: [smartAccount.address.toUpperCase()]
        }])
    })
})
