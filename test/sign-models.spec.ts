/* eslint-env mocha */
import * as assert from 'assert'
import { RelayedRequest } from '../src/pages/Sign/models'

const gid = `0x${'1'.repeat(64)}`
const address = `0x${'2'.repeat(40)}`
const txId = `0x${'3'.repeat(64)}`

describe('sign request models', () => {
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
    })
})
