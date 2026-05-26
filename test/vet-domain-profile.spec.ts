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
    getVetDomainRegistry,
    isHttpUrl,
    normalizeVetDomainProfile,
    parseIpfsPinningResponse,
    supportsVetDomainProfile,
    uploadVetDomainProfileAvatar,
    vetDomainProfileTransactionComment,
    vetDomainSetTextABI
} from '../src/utils/vet-domain-profile'

function restoreMode(value: string | undefined) {
    if (value === undefined) {
        delete process.env.MODE
        return
    }
    process.env.MODE = value
}

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

    it('rejects unsupported or malformed media URIs', () => {
        assert.strictEqual(convertVetDomainProfileUriToUrl('   ', genesises.main.id), '')
        assert.strictEqual(convertVetDomainProfileUriToUrl('data:image/png;base64,abc', genesises.main.id), 'data:image/png;base64,abc')
        assert.strictEqual(convertVetDomainProfileUriToUrl('ipfs://QmHash//bad', genesises.main.id), '')
        assert.strictEqual(convertVetDomainProfileUriToUrl('ipfs://QmHash/avatar.png', '0xunsupported'), '')
        assert.strictEqual(convertVetDomainProfileUriToUrl('ftp://example.com/a.png', genesises.main.id), '')
    })

    it('parses IPFS pinning responses with stable upload errors', () => {
        assert.strictEqual(parseIpfsPinningResponse('{"IpfsHash":"QmHash"}'), 'ipfs://QmHash')
        assert.throws(() => parseIpfsPinningResponse('{"IpfsHash":""}'), /IPFS upload did not return a hash/)
        assert.throws(() => parseIpfsPinningResponse('not-json'), /IPFS upload did not return a hash/)
        assert.throws(() => parseIpfsPinningResponse('{"Hash":"QmHash"}'), /IPFS upload did not return a hash/)
    })

    it('detects supported networks and safe profile links', () => {
        assert.strictEqual(supportsVetDomainProfile(genesises.main.id), true)
        assert.strictEqual(supportsVetDomainProfile(genesises.test.id), true)
        assert.strictEqual(supportsVetDomainProfile('0xunsupported'), false)
        assert.strictEqual(isHttpUrl('https://example.com'), true)
        assert.strictEqual(isHttpUrl('http://example.com'), true)
        assert.strictEqual(isHttpUrl('ipfs://QmHash'), false)
        assert.strictEqual(isHttpUrl('bad'), false)
        assert.strictEqual(vetDomainProfileTransactionComment('alice.vet'), 'Update VNS profile alice.vet')
        assert.strictEqual(getVetDomainRegistry({ registry: '0x1', controller: '0x2', resolver: '0x3' }), '0x1')
    })

    it('uploads avatars through the profile pinning service', async () => {
        const originalFetch = global.fetch
        const previousMode = process.env.MODE
        const calls: Array<{ input: string | URL | Request, init?: RequestInit }> = []

        process.env.MODE = 'web'
        global.fetch = ((input: string | URL | Request, init?: RequestInit) => {
            calls.push({ input, init })
            return Promise.resolve({
                ok: true,
                status: 200,
                text: () => Promise.resolve('{"IpfsHash":"QmAvatar"}')
            } as Response)
        }) as typeof fetch

        try {
            const result = await uploadVetDomainProfileAvatar(new Blob(['avatar'], { type: 'image/jpeg' }), 'avatar.jpg', genesises.main.id)

            assert.strictEqual(result, 'ipfs://QmAvatar')
            assert.strictEqual(calls.length, 1)
            assert.strictEqual(calls[0].input, 'https://api.gateway-proxy.vechain.org/api/v1/pinning/pinFileToIPFS')
            assert.strictEqual(calls[0].init!.method, 'POST')
            assert.strictEqual((calls[0].init!.headers as Record<string, string>)['X-Project-Id'], 'vechain-kit')
            assert.strictEqual(calls[0].init!.body instanceof FormData, true)
        } finally {
            global.fetch = originalFetch
            restoreMode(previousMode)
        }
    })

    it('reports avatar upload failures with actionable errors', async () => {
        const originalFetch = global.fetch
        const previousMode = process.env.MODE

        process.env.MODE = 'web'
        global.fetch = (() => {
            return Promise.resolve({
                ok: false,
                status: 503,
                text: () => Promise.resolve('')
            } as Response)
        }) as typeof fetch

        try {
            await assert.rejects(
                uploadVetDomainProfileAvatar(new Blob(['avatar']), 'avatar.jpg', '0xunsupported'),
                /VNS profile is not supported/
            )
            await assert.rejects(
                uploadVetDomainProfileAvatar(new Blob(['avatar']), 'avatar.jpg', genesises.test.id),
                /IPFS upload failed with status 503/
            )
        } finally {
            global.fetch = originalFetch
            restoreMode(previousMode)
        }
    })
})
