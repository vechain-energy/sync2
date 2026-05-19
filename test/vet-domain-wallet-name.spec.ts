/* eslint-env mocha */
import * as assert from 'assert'
import { genesises } from '../src/consts'
import {
    firstVetDomainWalletName,
    vetDomainWalletDisplayName
} from '../src/utils/vet-domain-wallet-name'

const wallet: M.Wallet = {
    id: 1,
    gid: genesises.main.id,
    vault: '',
    meta: {
        name: 'My Wallet',
        type: 'hd',
        addresses: ['0x1111111111111111111111111111111111111111']
    }
}

describe('vet domain wallet names', () => {
    it('uses the first reverse domain as wallet display name', () => {
        assert.strictEqual(firstVetDomainWalletName(['', 'alice.vet', 'bob.vet']), 'alice.vet')
        assert.strictEqual(vetDomainWalletDisplayName(wallet, ['', 'alice.vet']), 'alice.vet')
    })

    it('falls back to wallet name without a reverse domain', () => {
        assert.strictEqual(firstVetDomainWalletName(['', '']), '')
        assert.strictEqual(vetDomainWalletDisplayName(wallet, ['', '']), 'My Wallet')
    })
})
