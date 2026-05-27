/* eslint-env mocha */
import * as assert from 'assert'
import { abi } from 'thor-devkit'
import {
    accountCreatedEventABI,
    buildSmartAccountClauses,
    decodeAccountCreatedEvent,
    mergeSmartAccounts,
    smartAccountFactoryABIs,
    smartAccountFactoryByGid
} from '../src/utils/smart-accounts'
import { genesises } from '../src/consts'

const owner = `0x${'1'.repeat(40)}`
const smartAccount = `0x${'2'.repeat(40)}`
const recipient = `0x${'3'.repeat(40)}`
const token = `0x${'4'.repeat(40)}`

describe('smart account helpers', () => {
    it('defines VeChain Kit factory addresses for supported networks', () => {
        assert.strictEqual(smartAccountFactoryByGid[genesises.main.id], '0xC06Ad8573022e2BE416CA89DA47E8c592971679A')
        assert.strictEqual(smartAccountFactoryByGid[genesises.test.id], '0x713b908Bcf77f3E00EFEf328E50b657a1A23AeaF')
    })

    it('decodes AccountCreated events', () => {
        const event = new abi.Event(accountCreatedEventABI)
        const data = abi.encodeParameters(accountCreatedEventABI.inputs, [smartAccount, owner, '42'])
        const decoded = decodeAccountCreatedEvent({
            address: smartAccount,
            topics: [event.signature],
            data
        })

        assert.deepStrictEqual(decoded, {
            account: smartAccount,
            owner,
            salt: '42'
        })
    })

    it('dedupes smart accounts by address and preserves deployed state', () => {
        const accounts = mergeSmartAccounts([{
            address: smartAccount,
            owner,
            walletId: 1,
            gid: genesises.main.id,
            version: 1,
            salt: '0',
            source: 'event',
            deployed: false
        }, {
            address: smartAccount.toUpperCase(),
            owner,
            walletId: 1,
            gid: genesises.main.id,
            version: 3,
            salt: '0',
            source: 'default',
            deployed: true
        }])

        assert.strictEqual(accounts.length, 1)
        assert.strictEqual(accounts[0].address, smartAccount.toUpperCase())
        assert.strictEqual(accounts[0].source, 'default')
        assert.strictEqual(accounts[0].deployed, true)
    })

    it('wraps one clause with execute', () => {
        const transferData = `0xa9059cbb${'0'.repeat(64)}`
        const [wrapped] = buildSmartAccountClauses({
            address: smartAccount,
            owner,
            walletId: 1,
            gid: genesises.main.id,
            version: 3,
            salt: '0',
            source: 'default',
            deployed: true
        }, [{
            to: token,
            value: '7',
            data: transferData,
            comment: 'transfer'
        }])

        assert.strictEqual(wrapped.to, smartAccount)
        assert.strictEqual(wrapped.value, 0)
        assert.strictEqual(wrapped.comment, 'transfer')

        const func = new abi.Function(smartAccountFactoryABIs.execute)
        const decoded = abi.decodeParameters(func.definition.inputs, `0x${wrapped.data!.slice(func.signature.length)}`)
        assert.strictEqual(decoded.dest, token)
        assert.strictEqual(decoded.value, '7')
        assert.strictEqual(decoded.func, transferData)
    })

    it('wraps multiple clauses with executeBatch', () => {
        const [wrapped] = buildSmartAccountClauses({
            address: smartAccount,
            owner,
            walletId: 1,
            gid: genesises.main.id,
            version: 3,
            salt: '0',
            source: 'default',
            deployed: true
        }, [{
            to: token,
            value: '1',
            data: '0x1234',
            comment: 'first'
        }, {
            to: recipient,
            value: '2',
            data: '0x'
        }])

        assert.strictEqual(wrapped.to, smartAccount)
        assert.strictEqual(wrapped.value, 0)
        assert.strictEqual(wrapped.comment, 'first')

        const func = new abi.Function(smartAccountFactoryABIs.executeBatch)
        const decoded = abi.decodeParameters(func.definition.inputs, `0x${wrapped.data!.slice(func.signature.length)}`)
        assert.deepStrictEqual(decoded.dest, [token, recipient])
        assert.deepStrictEqual(decoded.value, ['1', '2'])
        assert.deepStrictEqual(decoded.func, ['0x1234', '0x'])
    })

    it('rejects contract deployment clauses for smart account wrapping', () => {
        assert.throws(() => buildSmartAccountClauses({
            address: smartAccount,
            owner,
            walletId: 1,
            gid: genesises.main.id,
            version: 3,
            salt: '0',
            source: 'default',
            deployed: true
        }, [{
            to: null,
            value: 0,
            data: '0x'
        }]), /owner account/)
    })
})
