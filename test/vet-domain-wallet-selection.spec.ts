/* eslint-env mocha */
import * as assert from 'assert'
import { genesises } from '../src/consts'
import {
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
    it('keeps the hidden wallet and owner address in the same wallet', () => {
        assert.strictEqual(findVetDomainWallet([walletA, walletB], 2), walletB)
        assert.strictEqual(findVetDomainWallet([walletA, walletB], 99), walletA)
        assert.strictEqual(findVetDomainWallet([], 99), null)
        assert.strictEqual(resolveVetDomainAddress(walletB, walletA.meta.addresses[0]), walletB.meta.addresses[0])
        assert.strictEqual(resolveVetDomainAddress(walletA, walletA.meta.addresses[1]), walletA.meta.addresses[1])
        assert.strictEqual(resolveVetDomainAddress({ ...walletA, meta: { ...walletA.meta, addresses: [] } }, walletA.meta.addresses[0]), '')
        assert.strictEqual(resolveVetDomainAddress(null, walletA.meta.addresses[0]), '')
    })
})
