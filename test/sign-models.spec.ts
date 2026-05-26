/* eslint-env mocha */
import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import { blake2b256 } from 'thor-devkit'
import { RelayedRequest } from '../src/pages/Sign/models'

const gid = `0x${'1'.repeat(64)}`
const address = `0x${'2'.repeat(40)}`
const txId = `0x${'3'.repeat(64)}`
const vedelegateRelayBody = [
    '{"type":"tx","gid":"0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a","payload":',
    '{"message":[{"to":"0x642a263BeE274109A2513f219E9DC975D64E4ebE","value":"0x0",',
    '"data":"0xfbca6ba60000000000000000000000000000000000000000000000000000019742ceda5a",',
    '"comment":"Execute maintenance actions"}],"options":{"signer":"0x105199a26b10e55300cb71b46c5b5e867b7df427",',
    '"gas":8000000}},"nonce":"521474c2bdefd09a9c470c0906dc5cab"}'
].join('')

describe('sign request models', () => {
    it('uses the validated relay URL for fetch and status callbacks', () => {
        const source = fs.readFileSync(path.join(__dirname, '..', 'src/pages/Sign/Controller.vue'), 'utf8')

        assert.ok(source.includes('${urlObject.href}?wait=1'))
        assert.ok(source.includes('${urlObject.href}${suffix}'))
        assert.strictEqual(source.includes('${this.src}?wait=1'), false)
        assert.strictEqual(source.includes('${this.src}${suffix}'), false)
    })

    it('validates transaction relayed requests', () => {
        const request = RelayedRequest.validate({
            gid,
            type: 'tx',
            payload: {
                message: [{
                    to: address,
                    value: '100',
                    data: '0xabcdef',
                    comment: 'Transfer'
                }],
                options: {
                    signer: address,
                    gas: 21000,
                    dependsOn: txId,
                    link: 'https://example.com/tx/{txid}',
                    comment: 'Payment',
                    delegator: {
                        url: 'https://example.com/delegate',
                        signer: address
                    }
                }
            }
        })

        if (request.type !== 'tx') {
            assert.fail('expected tx request')
        }
        assert.strictEqual(request.payload.message[0].to, address)
        assert.strictEqual(request.payload.options.link, 'https://example.com/tx/{txid}')
    })

    it('validates vedelegate transaction requests with hex clause values', () => {
        assert.strictEqual(
            blake2b256(vedelegateRelayBody).toString('hex'),
            '6d35662694cbdfb07d162cd84d5cc7779fdf86c0472262cb079cb05d4770d0db'
        )

        const request = RelayedRequest.validate(JSON.parse(vedelegateRelayBody))

        if (request.type !== 'tx') {
            assert.fail('expected tx request')
        }
        assert.strictEqual(request.payload.message[0].value, '0')
        assert.strictEqual(request.payload.message[0].data, '0xfbca6ba60000000000000000000000000000000000000000000000000000019742ceda5a')
        assert.strictEqual(request.payload.message[0].comment, 'Execute maintenance actions')
        assert.strictEqual(request.payload.options.signer, '0x105199a26b10e55300cb71b46c5b5e867b7df427')
        assert.strictEqual(request.payload.options.gas, 8000000)
    })

    it('normalizes non-zero hex clause values', () => {
        const request = RelayedRequest.validate({
            gid,
            type: 'tx',
            payload: {
                message: [{
                    to: null,
                    value: 10,
                    data: '0x',
                    abi: {
                        name: 'transfer'
                    }
                }, {
                    to: address,
                    value: '0x10'
                }],
                options: {}
            }
        })

        if (request.type !== 'tx') {
            assert.fail('expected tx request')
        }
        assert.strictEqual(request.payload.message[0].to, null)
        assert.strictEqual(request.payload.message[0].value, 10)
        assert.strictEqual(request.payload.message[1].value, '16')
    })

    it('rejects malformed transaction requests', () => {
        assert.throws(() => RelayedRequest.validate({
            gid,
            type: 'tx',
            payload: {
                message: [],
                options: {}
            }
        }), /non-empty array/)

        assert.throws(() => RelayedRequest.validate({
            gid,
            type: 'tx',
            payload: {
                message: [{
                    to: address,
                    value: '-1',
                    data: '0x'
                }],
                options: {}
            }
        }), /non-negative integer/)

        assert.throws(() => RelayedRequest.validate({
            gid,
            type: 'tx',
            payload: {
                message: [{
                    to: address,
                    value: '1',
                    data: 'not-hex'
                }],
                options: {}
            }
        }), /invalid message\[0\]\.data/)

        assert.throws(() => RelayedRequest.validate({
            gid,
            type: 'tx',
            payload: {
                message: [{
                    to: address,
                    value: '0x',
                    data: '0x'
                }],
                options: {}
            }
        }), /hex quantity/)

        assert.throws(() => RelayedRequest.validate({
            gid,
            type: 'tx',
            payload: {
                message: [{
                    to: 'not-address',
                    value: '1'
                }],
                options: {}
            }
        }), /invalid message\[0\]\.to/)

        assert.throws(() => RelayedRequest.validate({
            gid,
            type: 'tx',
            payload: {
                message: [{
                    to: address,
                    value: Number.MAX_SAFE_INTEGER + 1
                }],
                options: {}
            }
        }), /non-negative safe integer/)

        assert.throws(() => RelayedRequest.validate({
            gid,
            type: 'tx',
            payload: {
                message: [{
                    to: address,
                    value: '1',
                    abi: 'bad'
                }],
                options: {}
            }
        }), /abi requires object type/)

        assert.throws(() => RelayedRequest.validate({
            gid,
            type: 'tx',
            payload: {
                message: [{
                    to: address,
                    value: '1'
                }],
                options: {
                    gas: 0
                }
            }
        }), /gas requires a positive safe integer/)

        assert.throws(() => RelayedRequest.validate({
            gid: '0x0',
            type: 'tx',
            payload: {
                message: [{
                    to: address,
                    value: '1'
                }],
                options: {}
            }
        }), /invalid gid/)

        assert.throws(() => RelayedRequest.validate({
            gid,
            origin: {},
            type: 'tx',
            payload: {
                message: [{
                    to: address,
                    value: '1'
                }],
                options: {}
            }
        }), /origin requires string type/)
    })

    it('rejects unsafe relayed request links', () => {
        assert.throws(() => RelayedRequest.validate({
            gid,
            type: 'tx',
            payload: {
                message: [{
                    to: address,
                    value: '1',
                    data: '0x'
                }],
                options: {
                    link: 'javascript:alert(1)'
                }
            }
        }), /link requires http or https URL/)
    })

    it('validates certificate relayed requests', () => {
        const request = RelayedRequest.validate({
            gid,
            type: 'cert',
            payload: {
                message: {
                    purpose: 'agreement',
                    payload: {
                        type: 'text',
                        content: 'terms'
                    }
                },
                options: {
                    signer: address,
                    link: 'https://example.com/cert/{certid}'
                }
            }
        })

        if (request.type !== 'cert') {
            assert.fail('expected cert request')
        }
        assert.strictEqual(request.payload.message.payload.content, 'terms')
    })

    it('rejects malformed certificate relayed requests', () => {
        assert.throws(() => RelayedRequest.validate({
            gid,
            type: 'cert',
            payload: {
                message: {
                    purpose: 'login',
                    payload: {
                        type: 'text',
                        content: 'terms'
                    }
                },
                options: {}
            }
        }), /unsupported certificate purpose/)

        assert.throws(() => RelayedRequest.validate({
            gid,
            type: 'cert',
            payload: {
                message: {
                    purpose: 'agreement',
                    payload: {
                        type: 'html',
                        content: '<b>terms</b>'
                    }
                },
                options: {}
            }
        }), /unsupported certificate payload type/)

        assert.throws(() => RelayedRequest.validate({
            gid,
            type: 'cert',
            payload: {
                message: {
                    purpose: 'agreement',
                    payload: {
                        type: 'text',
                        content: 1
                    }
                },
                options: {
                    signer: 'not-address'
                }
            }
        }), /content requires string type/)

        assert.throws(() => RelayedRequest.validate({
            gid,
            type: 'unknown',
            payload: {}
        }), /unsupported type/)
    })
})
