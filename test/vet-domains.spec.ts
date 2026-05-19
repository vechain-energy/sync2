/* eslint-env mocha */
import * as assert from 'assert'
import {
    ZERO_ADDRESS,
    cleanResolvedAddress,
    cleanResolvedName,
    isVetDomainName,
    normalizeVetDomainName
} from '../src/utils/vet-domains'

describe('.vet.domains helpers', () => {
    it('normalizes names before lookup', () => {
        assert.strictEqual(normalizeVetDomainName('  Alice.VET.Domains  '), 'alice.vet.domains')
    })

    it('accepts valid .vet.domains names only', () => {
        assert.strictEqual(isVetDomainName('alice.vet.domains'), true)
        assert.strictEqual(isVetDomainName('pay.alice.vet.domains'), true)
        assert.strictEqual(isVetDomainName('xn--alice.vet.domains'), true)

        assert.strictEqual(isVetDomainName('vet.domains'), false)
        assert.strictEqual(isVetDomainName('.vet.domains'), false)
        assert.strictEqual(isVetDomainName('alice.vet.domain'), false)
        assert.strictEqual(isVetDomainName('bad name.vet.domains'), false)
        assert.strictEqual(isVetDomainName('-bad.vet.domains'), false)
        assert.strictEqual(isVetDomainName('bad-.vet.domains'), false)
    })

    it('cleans unresolved addresses to empty strings', () => {
        assert.strictEqual(cleanResolvedAddress(ZERO_ADDRESS), '')
        assert.strictEqual(cleanResolvedAddress('not-an-address'), '')
    })

    it('keeps valid resolved addresses', () => {
        assert.notStrictEqual(cleanResolvedAddress('0x0000000000000000000000000000000000000001'), '')
    })

    it('cleans reverse lookup names', () => {
        assert.strictEqual(cleanResolvedName('Alice.VET.Domains'), 'alice.vet.domains')
        assert.strictEqual(cleanResolvedName('alice.vet.domain'), '')
    })
})
