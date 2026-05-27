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

const vechainKitExecuteABI: abi.Function.Definition = {
    inputs: [
        { name: 'dest', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'func', type: 'bytes' }
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
}

const executeWithAuthorizationABI: abi.Function.Definition = {
    inputs: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'data', type: 'bytes' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'signature', type: 'bytes' }
    ],
    name: 'executeWithAuthorization',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
}

const executeBatchABI: abi.Function.Definition = {
    inputs: [
        { name: 'dest', type: 'address[]' },
        { name: 'value', type: 'uint256[]' },
        { name: 'func', type: 'bytes[]' }
    ],
    name: 'executeBatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
}

const executeBatchWithAuthorizationABI: abi.Function.Definition = {
    inputs: [
        { name: 'to', type: 'address[]' },
        { name: 'value', type: 'uint256[]' },
        { name: 'data', type: 'bytes[]' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
        { name: 'signature', type: 'bytes' }
    ],
    name: 'executeBatchWithAuthorization',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
}

const transferFunction = new abi.Function(transferABI)
const executeFunction = new abi.Function(executeABI)
const vechainKitExecuteFunction = new abi.Function(vechainKitExecuteABI)
const executeWithAuthorizationFunction = new abi.Function(executeWithAuthorizationABI)
const executeBatchFunction = new abi.Function(executeBatchABI)
const executeBatchWithAuthorizationFunction = new abi.Function(executeBatchWithAuthorizationABI)

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
        assert.strictEqual(decoded.wrapperName, 'execute')
        assert.strictEqual(decoded.target, targetAddress)
        assert.strictEqual(decoded.value, '0')
        assert.strictEqual(decoded.operation, '0')
        assert.strictEqual(decoded.call.name, 'transfer')
        assert.strictEqual(decoded.call.params[0].value, recipientAddress)
        assert.strictEqual(decoded.call.params[1].value, '200')
    })

    it('decodes VeChain Kit execute data as the inner instruction', async () => {
        const innerData = transferFunction.encode(recipientAddress, '201')
        const decoded = await decodeClauseData({
            data: vechainKitExecuteFunction.encode(targetAddress, '1', innerData)
        }, resolverFor([vechainKitExecuteABI, transferABI]))

        assert.ok(decoded)
        assert.strictEqual(decoded.kind, 'smart-wallet-instruction')
        assert.strictEqual(decoded.wrapperName, 'execute')
        assert.strictEqual(decoded.target, targetAddress)
        assert.strictEqual(decoded.value, '1')
        assert.strictEqual(decoded.operation, undefined)
        assert.strictEqual(decoded.call.name, 'transfer')
        assert.strictEqual(decoded.call.params[1].value, '201')
    })

    it('decodes VeChain Kit executeWithAuthorization data as the inner instruction', async () => {
        const innerData = transferFunction.encode(recipientAddress, '202')
        const decoded = await decodeClauseData({
            data: executeWithAuthorizationFunction.encode(targetAddress, '2', innerData, '10', '20', `0x${'ab'.repeat(65)}`)
        }, resolverFor([executeWithAuthorizationABI, transferABI]))

        assert.ok(decoded)
        assert.strictEqual(decoded.kind, 'smart-wallet-instruction')
        assert.strictEqual(decoded.wrapperName, 'executeWithAuthorization')
        assert.strictEqual(decoded.target, targetAddress)
        assert.strictEqual(decoded.value, '2')
        assert.strictEqual(decoded.metaParams[0].name, 'validAfter')
        assert.strictEqual(decoded.metaParams[0].value, '10')
        assert.strictEqual(decoded.metaParams[1].name, 'validBefore')
        assert.strictEqual(decoded.metaParams[1].value, '20')
        assert.strictEqual(decoded.metaParams[2].name, 'signature')
        assert.strictEqual(decoded.call.name, 'transfer')
        assert.strictEqual(decoded.call.params[1].value, '202')
    })

    it('decodes VeChain Kit executeBatch data as inner instructions', async () => {
        const firstInnerData = transferFunction.encode(recipientAddress, '203')
        const secondInnerData = transferFunction.encode(recipientAddress, '204')
        const decoded = await decodeClauseData({
            data: executeBatchFunction.encode([targetAddress, targetAddress], ['3', '4'], [firstInnerData, secondInnerData])
        }, resolverFor([executeBatchABI, transferABI]))

        assert.ok(decoded)
        assert.strictEqual(decoded.kind, 'smart-wallet-batch')
        assert.strictEqual(decoded.wrapperName, 'executeBatch')
        assert.strictEqual(decoded.instructions.length, 2)
        assert.strictEqual(decoded.instructions[0].target, targetAddress)
        assert.strictEqual(decoded.instructions[0].value, '3')
        assert.strictEqual(decoded.instructions[0].call.name, 'transfer')
        assert.strictEqual(decoded.instructions[0].call.params[1].value, '203')
        assert.strictEqual(decoded.instructions[1].target, targetAddress)
        assert.strictEqual(decoded.instructions[1].value, '4')
        assert.strictEqual(decoded.instructions[1].call.params[1].value, '204')
    })

    it('decodes VeChain Kit executeBatchWithAuthorization data as inner instructions', async () => {
        const innerData = transferFunction.encode(recipientAddress, '205')
        const nonce = `0x${'12'.repeat(32)}`
        const decoded = await decodeClauseData({
            data: executeBatchWithAuthorizationFunction.encode(
                [targetAddress],
                ['5'],
                [innerData],
                '11',
                '22',
                nonce,
                `0x${'cd'.repeat(65)}`
            )
        }, resolverFor([executeBatchWithAuthorizationABI, transferABI]))

        assert.ok(decoded)
        assert.strictEqual(decoded.kind, 'smart-wallet-batch')
        assert.strictEqual(decoded.wrapperName, 'executeBatchWithAuthorization')
        assert.strictEqual(decoded.metaParams[0].name, 'validAfter')
        assert.strictEqual(decoded.metaParams[0].value, '11')
        assert.strictEqual(decoded.metaParams[1].name, 'validBefore')
        assert.strictEqual(decoded.metaParams[1].value, '22')
        assert.strictEqual(decoded.metaParams[2].name, 'nonce')
        assert.strictEqual(decoded.metaParams[2].value, nonce)
        assert.strictEqual(decoded.metaParams[3].name, 'signature')
        assert.strictEqual(decoded.instructions[0].target, targetAddress)
        assert.strictEqual(decoded.instructions[0].value, '5')
        assert.strictEqual(decoded.instructions[0].call.params[1].value, '205')
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
