/* eslint-env mocha */
import * as assert from 'assert'
import { genesises } from '../src/consts'
import {
    buildVetDomainAddressOptions,
    buildVetDomainWalletOptions,
    findVetDomainWallet,
    resolveVetDomainAddress
} from '../src/utils/vet-domain-wallet-selection'

const walletA: M.Wallet = {
    id: 1,
    gid: genesises.main.id,
    vault: '',
    meta: {
        name: 'Main Wallet',
        type: 'hd',
        addresses: [
            '0x1111111111111111111111111111111111111111',
            '0x2222222222222222222222222222222222222222'
        ]
    }
}

const walletB: M.Wallet = {
    id: 2,
    gid: genesises.test.id,
    vault: '',
    meta: {
        name: 'Test Wallet',
        type: 'private-key',
        addresses: ['0x3333333333333333333333333333333333333333']
    }
}

describe('vet domain wallet selection', () => {
    it('builds wallet and address picker options', () => {
        assert.deepStrictEqual(buildVetDomainWalletOptions([walletA, walletB]), [
            { label: 'Main Wallet - 0x11111111...11111111', value: 1 },
            { label: 'Test Wallet - 0x33333333...33333333', value: 2 }
        ])
        assert.deepStrictEqual(buildVetDomainAddressOptions(walletA), [
            { label: '#1 - 0x11111111...11111111', value: walletA.meta.addresses[0], walletId: 1 },
            { label: '#2 - 0x22222222...22222222', value: walletA.meta.addresses[1], walletId: 1 }
        ])
    })

    it('keeps selected wallet and address in the same wallet', () => {
        assert.strictEqual(findVetDomainWallet([walletA, walletB], 2), walletB)
        assert.strictEqual(findVetDomainWallet([walletA, walletB], 99), walletA)
        assert.strictEqual(resolveVetDomainAddress(walletB, walletA.meta.addresses[0]), walletB.meta.addresses[0])
        assert.strictEqual(resolveVetDomainAddress(walletA, walletA.meta.addresses[1]), walletA.meta.addresses[1])
        assert.strictEqual(resolveVetDomainAddress(null, walletA.meta.addresses[0]), '')
    })
})
