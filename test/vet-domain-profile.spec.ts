/* eslint-env mocha */
import * as assert from 'assert'
import * as Module from 'module'
import { abi } from 'thor-devkit'
import { genesises } from '../src/consts'
import { vetDomainNamehash } from '../src/utils/vet-domain-registration'
import {
    VET_DOMAIN_PROFILE_AVATAR_MAX_BYTES,
    buildVetDomainProfileUpdateClauses,
    changedVetDomainProfileRecords,
    convertVetDomainProfileUriToUrl,
    emptyVetDomainProfile,
    getVetDomainRegistry,
    isHttpUrl,
    normalizeVetDomainProfile,
    parseIpfsPinningResponse,
    prepareVetDomainProfileAvatar,
    supportsVetDomainProfile,
    uploadVetDomainProfileAvatar,
    vetDomainProfileTransactionComment,
    vetDomainSetTextABI
} from '../src/utils/vet-domain-profile'

type ModuleWithLoad = typeof Module & {
    _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown
}

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

    it('prepares avatars without recompression when the selected image is already small', async () => {
        const globalScope = globalThis as typeof globalThis & {
            Image: typeof Image
        }
        const originalImage = globalScope.Image
        const originalCreateObjectURL = URL.createObjectURL
        const originalRevokeObjectURL = URL.revokeObjectURL
        const revoked: string[] = []

        class ImageMock {
            width = 128
            height = 96
            onload: (() => void) | null = null
            onerror: (() => void) | null = null

            set src(_value: string) {
                this.onload?.()
            }
        }

        URL.createObjectURL = () => 'blob:avatar'
        URL.revokeObjectURL = url => {
            revoked.push(url)
        }
        globalScope.Image = ImageMock as unknown as typeof Image

        try {
            const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
            const prepared = await prepareVetDomainProfileAvatar(file)
            const unnamed = await prepareVetDomainProfileAvatar(new File(['avatar'], '', { type: 'image/png' }))

            assert.strictEqual(prepared.blob, file)
            assert.strictEqual(prepared.filename, 'avatar.png')
            assert.strictEqual(unnamed.filename, 'avatar.png')
            assert.deepStrictEqual(revoked, ['blob:avatar', 'blob:avatar'])
        } finally {
            URL.createObjectURL = originalCreateObjectURL
            URL.revokeObjectURL = originalRevokeObjectURL
            globalScope.Image = originalImage
        }
    })

    it('compresses large avatars and reports invalid image files', async () => {
        const globalScope = globalThis as typeof globalThis & {
            Image: typeof Image
            document: Document
        }
        const originalImage = globalScope.Image
        const originalDocument = globalScope.document
        const originalCreateObjectURL = URL.createObjectURL
        const originalRevokeObjectURL = URL.revokeObjectURL
        const qualities: number[] = []

        class LargeImageMock {
            width = 4000
            height = 2000
            onload: (() => void) | null = null
            onerror: (() => void) | null = null

            set src(_value: string) {
                this.onload?.()
            }
        }

        URL.createObjectURL = () => 'blob:large-avatar'
        URL.revokeObjectURL = () => {}
        globalScope.Image = LargeImageMock as unknown as typeof Image
        globalScope.document = {
            createElement: () => ({
                width: 0,
                height: 0,
                getContext: () => ({
                    fillStyle: '',
                    fillRect: () => {},
                    drawImage: () => {}
                } as unknown as CanvasRenderingContext2D),
                toBlob: (callback: BlobCallback, _type?: string, quality?: number) => {
                    qualities.push(quality || 0)
                    const size = qualities.length === 1 ? VET_DOMAIN_PROFILE_AVATAR_MAX_BYTES + 1 : 1024
                    callback(new Blob([new Uint8Array(size)], { type: 'image/jpeg' }))
                }
            } as unknown as HTMLCanvasElement)
        } as unknown as Document

        try {
            const prepared = await prepareVetDomainProfileAvatar(new File(['avatar'], ' profile.large.png ', { type: 'image/png' }))

            assert.strictEqual(prepared.filename, 'profile.large.jpg')
            assert.strictEqual(prepared.blob.type, 'image/jpeg')
            assert.deepStrictEqual(qualities, [0.9, 0.8])

            const unnamed = await prepareVetDomainProfileAvatar(new File(['avatar'], '.png', { type: 'image/png' }))
            assert.strictEqual(unnamed.filename, 'avatar.jpg')
            assert.deepStrictEqual(qualities, [0.9, 0.8, 0.9])

            class BadImageMock {
                width = 0
                height = 0
                onload: (() => void) | null = null
                onerror: (() => void) | null = null

                set src(_value: string) {
                    this.onerror?.()
                }
            }

            globalScope.Image = BadImageMock as unknown as typeof Image
            await assert.rejects(
                prepareVetDomainProfileAvatar(new File(['bad'], 'bad.txt', { type: 'text/plain' })),
                /selected file is not a valid image/
            )
        } finally {
            URL.createObjectURL = originalCreateObjectURL
            URL.revokeObjectURL = originalRevokeObjectURL
            globalScope.Image = originalImage
            globalScope.document = originalDocument
        }
    })

    it('reports avatar compression canvas failures', async () => {
        const globalScope = globalThis as typeof globalThis & {
            Image: typeof Image
            document: Document
        }
        const originalImage = globalScope.Image
        const originalDocument = globalScope.document
        const originalCreateObjectURL = URL.createObjectURL
        const originalRevokeObjectURL = URL.revokeObjectURL

        class LargeImageMock {
            width = 4000
            height = 2000
            onload: (() => void) | null = null
            onerror: (() => void) | null = null

            set src(_value: string) {
                this.onload?.()
            }
        }

        URL.createObjectURL = () => 'blob:large-avatar'
        URL.revokeObjectURL = () => {}
        globalScope.Image = LargeImageMock as unknown as typeof Image

        try {
            globalScope.document = {
                createElement: () => ({
                    width: 0,
                    height: 0,
                    getContext: () => null
                } as unknown as HTMLCanvasElement)
            } as unknown as Document
            await assert.rejects(
                prepareVetDomainProfileAvatar(new File(['avatar'], 'avatar.png', { type: 'image/png' })),
                /image compression failed/
            )

            globalScope.document = {
                createElement: () => ({
                    width: 0,
                    height: 0,
                    getContext: () => ({
                        fillStyle: '',
                        fillRect: () => {},
                        drawImage: () => {}
                    } as unknown as CanvasRenderingContext2D),
                    toBlob: (callback: BlobCallback) => {
                        callback(null)
                    }
                } as unknown as HTMLCanvasElement)
            } as unknown as Document
            await assert.rejects(
                prepareVetDomainProfileAvatar(new File(['avatar'], 'avatar.png', { type: 'image/png' })),
                /image compression failed/
            )
        } finally {
            URL.createObjectURL = originalCreateObjectURL
            URL.revokeObjectURL = originalRevokeObjectURL
            globalScope.Image = originalImage
            globalScope.document = originalDocument
        }
    })

    it('uploads avatars through the Electron node HTTPS path', async () => {
        const moduleWithLoad = require('module') as ModuleWithLoad
        const originalLoad = moduleWithLoad._load
        const previousMode = process.env.MODE
        let requestBody = ''
        let requestedHost = ''

        process.env.MODE = 'electron'
        moduleWithLoad._load = (request, parent, isMain) => {
            if (request === 'https') {
                return {
                    request: (
                        options: { hostname?: string },
                        callback: (res: {
                            statusCode: number
                            on: (event: 'data' | 'end', handler: (chunk?: Buffer) => void) => void
                        }) => void
                    ) => {
                        requestedHost = options.hostname || ''
                        return {
                            on: () => {},
                            end: (body: Buffer) => {
                                requestBody = body.toString('utf8')
                                const handlers: Partial<Record<'data' | 'end', (chunk?: Buffer) => void>> = {}
                                callback({
                                    statusCode: 200,
                                    on: (event, handler) => {
                                        handlers[event] = handler
                                    }
                                })
                                handlers.data?.(Buffer.from('{"IpfsHash":"QmNode"}'))
                                handlers.end?.()
                            }
                        }
                    }
                }
            }

            return originalLoad(request, parent, isMain)
        }

        try {
            const result = await uploadVetDomainProfileAvatar(
                new Blob(['avatar'], { type: 'image/jpeg' }),
                'bad"\nname.png',
                genesises.main.id
            )

            assert.strictEqual(result, 'ipfs://QmNode')
            assert.strictEqual(requestedHost, 'api.gateway-proxy.vechain.org')
            assert.strictEqual(requestBody.includes('filename="bad__name.png"'), true)
        } finally {
            moduleWithLoad._load = originalLoad
            restoreMode(previousMode)
        }
    })

    it('reports Electron avatar upload HTTP failures', async () => {
        const moduleWithLoad = require('module') as ModuleWithLoad
        const originalLoad = moduleWithLoad._load
        const previousMode = process.env.MODE
        let requestBody = ''

        type MockResponse = {
            statusCode?: number
            on: (event: 'data' | 'end', handler: (chunk?: Buffer | string) => void) => void
        }

        process.env.MODE = 'electron'
        moduleWithLoad._load = (request, parent, isMain) => {
            if (request === 'https') {
                return {
                    request: (
                        _options: { hostname?: string },
                        callback: (res: MockResponse) => void
                    ) => {
                        return {
                            on: () => {},
                            end: (body: Buffer) => {
                                requestBody = body.toString('utf8')
                                const handlers: Partial<Record<'data' | 'end', (chunk?: Buffer | string) => void>> = {}
                                callback({
                                    on: (event, handler) => {
                                        handlers[event] = handler
                                    }
                                })
                                handlers.data?.('bad')
                                handlers.end?.()
                            }
                        }
                    }
                }
            }

            return originalLoad(request, parent, isMain)
        }

        try {
            await assert.rejects(
                uploadVetDomainProfileAvatar(new Blob(['avatar']), '', genesises.main.id),
                /IPFS upload failed with status 0/
            )
            assert.strictEqual(requestBody.includes('filename="avatar"'), true)
            assert.strictEqual(requestBody.includes('Content-Type: application/octet-stream'), true)
        } finally {
            moduleWithLoad._load = originalLoad
            restoreMode(previousMode)
        }
    })
})
