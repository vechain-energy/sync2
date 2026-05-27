/* eslint-env mocha */
import * as assert from 'assert'
import { abi } from 'thor-devkit'
import { AbiResolver, decodeClauseData } from '../src/pages/Sign/clause-decoder'

const targetAddress = `0x${'1'.repeat(40)}`
const recipientAddress = `0x${'2'.repeat(40)}`

const transferABI: abi.Function.Definition = {
    constant: false,
    inputs: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
}

const executeABI: abi.Function.Definition = {
    inputs: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'data', type: 'bytes' },
        { name: 'operation', type: 'uint256' }
    ],
    name: 'execute',
    outputs: [{ name: 'result', type: 'bytes' }],
    stateMutability: 'payable',
    type: 'function'
}

const transferFunction = new abi.Function(transferABI)
const executeFunction = new abi.Function(executeABI)

function resolverFor(items: abi.Function.Definition[]): AbiResolver {
    const defsBySignature = new Map<string, abi.Function.Definition>()
    for (const item of items) {
        defsBySignature.set(new abi.Function(item).signature, item)
    }
    return async (signature: string) => defsBySignature.get(signature) || null
}

describe('sign clause decoder', () => {
    it('decodes normal B32 function data', async () => {
        const decoded = await decodeClauseData({
            data: transferFunction.encode(recipientAddress, '100')
        }, resolverFor([transferABI]))

        assert.ok(decoded)
        assert.strictEqual(decoded.kind, 'call')
        assert.strictEqual(decoded.name, 'transfer')
        assert.strictEqual(decoded.params[0].name, 'to')
        assert.strictEqual(decoded.params[0].value, recipientAddress)
        assert.strictEqual(decoded.params[1].name, 'value')
        assert.strictEqual(decoded.params[1].value, '100')
    })

    it('decodes smart wallet execute data as the inner instruction', async () => {
        const innerData = transferFunction.encode(recipientAddress, '200')
        const decoded = await decodeClauseData({
            data: executeFunction.encode(targetAddress, '0', innerData, '0')
        }, resolverFor([executeABI, transferABI]))

        assert.ok(decoded)
        assert.strictEqual(decoded.kind, 'smart-wallet-instruction')
        assert.strictEqual(decoded.target, targetAddress)
        assert.strictEqual(decoded.value, '0')
        assert.strictEqual(decoded.operation, '0')
        assert.strictEqual(decoded.call.name, 'transfer')
        assert.strictEqual(decoded.call.params[0].value, recipientAddress)
        assert.strictEqual(decoded.call.params[1].value, '200')
    })

    it('falls back to execute when smart wallet inner data cannot decode', async () => {
        const innerData = transferFunction.encode(recipientAddress, '300')
        const decoded = await decodeClauseData({
            data: executeFunction.encode(targetAddress, '0', innerData, '0')
        }, resolverFor([executeABI]))

        assert.ok(decoded)
        assert.strictEqual(decoded.kind, 'call')
        assert.strictEqual(decoded.name, 'execute')
        assert.strictEqual(decoded.params[0].value, targetAddress)
        assert.strictEqual(decoded.params[2].value, innerData)
    })

    it('returns null for short or empty data', async () => {
        const resolveAbi = resolverFor([transferABI])

        assert.strictEqual(await decodeClauseData({}, resolveAbi), null)
        assert.strictEqual(await decodeClauseData({ data: '0x' }, resolveAbi), null)
        assert.strictEqual(await decodeClauseData({ data: '0x1234' }, resolveAbi), null)
    })
})
