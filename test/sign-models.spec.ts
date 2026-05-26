/* eslint-env mocha */
import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import { RelayedRequest } from '../src/pages/Sign/models'

const gid = `0x${'1'.repeat(64)}`
const address = `0x${'2'.repeat(40)}`
const txId = `0x${'3'.repeat(64)}`
const abiString = JSON.stringify({
    type: 'function',
    name: 'claimRewards',
    constant: false,
    payable: false,
    inputs: [{
        type: 'uint256',
        name: '_tokenId'
    }],
    outputs: []
})

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

    it('validates transaction requests with hex clause values and JSON string ABI hints', () => {
        const request = RelayedRequest.validate({
            gid,
            type: 'tx',
            payload: {
                message: [{
                    to: address,
                    value: '0x0',
                    data: '0x0962ef790000000000000000000000000000000000000000000000000000000000000001',
                    comment: 'Claim rewards',
                    abi: abiString
                }],
                options: {
                    signer: address,
                    gas: 1037016
                }
            }
        })

        if (request.type !== 'tx') {
            assert.fail('expected tx request')
        }
        assert.strictEqual(request.payload.message[0].value, '0')
        assert.strictEqual(request.payload.message[0].comment, 'Claim rewards')
        assert.deepStrictEqual(request.payload.message[0].abi, {
            type: 'function',
            name: 'claimRewards',
            constant: false,
            payable: false,
            inputs: [{
                type: 'uint256',
                name: '_tokenId'
            }],
            outputs: []
        })
        assert.strictEqual(request.payload.options.signer, address)
        assert.strictEqual(request.payload.options.gas, 1037016)
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
        assert.throws(() => RelayedRequest.validate([]), /request requires object type/)

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
