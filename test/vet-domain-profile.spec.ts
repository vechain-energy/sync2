/* eslint-env mocha */
import * as assert from 'assert'
import { abi } from 'thor-devkit'
import { genesises } from '../src/consts'
import { vetDomainNamehash } from '../src/utils/vet-domain-registration'
import {
    buildVetDomainProfileUpdateClauses,
    changedVetDomainProfileRecords,
    convertVetDomainProfileUriToUrl,
    emptyVetDomainProfile,
    normalizeVetDomainProfile,
    vetDomainSetTextABI
} from '../src/utils/vet-domain-profile'

describe('vet domain profile helpers', () => {
    it('normalizes profile records', () => {
        const profile = normalizeVetDomainProfile({
            display: ' Alice ',
            description: ' Builder ',
            'com.x': '@alice'
        })

        assert.strictEqual(profile.display, 'Alice')
        assert.strictEqual(profile.description, 'Builder')
        assert.strictEqual(profile['com.x'], 'alice')
        assert.strictEqual(profile.avatar, '')
    })

    it('returns only changed text records', () => {
        const previous = emptyVetDomainProfile()
        previous.display = 'Alice'
        previous.description = 'Old'

        const next = emptyVetDomainProfile()
        next.display = 'Alice'
        next.description = ''
        next.url = 'https://example.com'

        assert.deepStrictEqual(changedVetDomainProfileRecords(previous, next), [
            { key: 'description', value: '' },
            { key: 'url', value: 'https://example.com' }
        ])
    })

    it('builds setText clauses', () => {
        const resolver = '0x0000000000000000000000000000000000000001'
        const clauses = buildVetDomainProfileUpdateClauses(resolver, 'alice.vet', [
            { key: 'description', value: 'hello' }
        ])
        const func = new abi.Function(vetDomainSetTextABI)

        assert.strictEqual(clauses.length, 1)
        assert.strictEqual(clauses[0].to, resolver)
        assert.strictEqual(clauses[0].value, 0)
        assert.strictEqual(
            clauses[0].data,
            func.encode(vetDomainNamehash('alice.vet'), 'description', 'hello')
        )
    })

    it('converts profile media URIs to URLs', () => {
        assert.strictEqual(
            convertVetDomainProfileUriToUrl('ipfs://QmHash/avatar.png', genesises.main.id),
            'https://api.gateway-proxy.vechain.org/ipfs/QmHash/avatar.png'
        )
        assert.strictEqual(
            convertVetDomainProfileUriToUrl('ipfs://QmHash/avatar.png', genesises.test.id),
            'https://api.dev.gateway-proxy.vechain.org/ipfs/QmHash/avatar.png'
        )
        assert.strictEqual(
            convertVetDomainProfileUriToUrl('ar://abc', genesises.main.id),
            'https://arweave.net/abc'
        )
        assert.strictEqual(
            convertVetDomainProfileUriToUrl('https://example.com/a.png', genesises.main.id),
            'https://example.com/a.png'
        )
        assert.strictEqual(convertVetDomainProfileUriToUrl('bad', genesises.main.id), '')
    })
})
