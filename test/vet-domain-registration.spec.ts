/* eslint-env mocha */
import * as assert from 'assert'
import { abi } from 'thor-devkit'
import { genesises } from '../src/consts'
import {
    buildVetDomainCommitClause,
    buildVetDomainRegisterClause,
    buildVetDomainResolverData,
    decodedBoolean,
    decodedNumber,
    decodedString,
    decodedVetDomainPrice,
    getVetDomainContracts,
    isBasicRegistrationName,
    normalizeRegistrationName,
    sumVetDomainPrice,
    vetDomainCommitABI,
    vetDomainCommitmentArgs,
    vetDomainFullName,
    vetDomainNamehash,
    vetDomainRegisterABI,
    vetDomainSetAddrABI,
    yearsToDuration
} from '../src/utils/vet-domain-registration'

describe('vet domain registration helpers', () => {
    it('normalizes registerable names', () => {
        assert.strictEqual(normalizeRegistrationName('  Alice.VET  '), 'alice')
        assert.strictEqual(normalizeRegistrationName('alice'), 'alice')
    })

    it('enforces basic name rules', () => {
        assert.strictEqual(isBasicRegistrationName('abc'), true)
        assert.strictEqual(isBasicRegistrationName('a-b-1.vet'), true)
        assert.strictEqual(isBasicRegistrationName('ab'), false)
        assert.strictEqual(isBasicRegistrationName('-abc'), false)
        assert.strictEqual(isBasicRegistrationName('abc-'), false)
        assert.strictEqual(isBasicRegistrationName('bad name'), false)
        assert.strictEqual(isBasicRegistrationName('sub.alice.vet'), false)
    })

    it('keeps namehash stable', () => {
        assert.strictEqual(vetDomainNamehash('alice.vet'), '0xd64e39d0f682838582d287e4261976a889a236c931d77a1813aa312b43acb934')
    })

    it('maps supported network contracts', () => {
        assert.strictEqual(getVetDomainContracts(genesises.main.id)!.controller, '0x07479F2710d16a0bACbE6C25b9b32447364C0A33')
        assert.strictEqual(getVetDomainContracts(genesises.test.id)!.controller, '0xAA854565401724f7061E0C366cA132c87C1e5F60')
        assert.strictEqual(getVetDomainContracts('0x0'), null)
    })

    it('converts years and sums VET price', () => {
        assert.strictEqual(yearsToDuration(1), 31536000)
        assert.strictEqual(yearsToDuration(2), 63072000)
        assert.throws(() => yearsToDuration(0), /invalid duration/)
        assert.strictEqual(sumVetDomainPrice({ base: '10', premium: '5' }), '15')
        assert.strictEqual(sumVetDomainPrice({ base: '', premium: '' }), '0')
    })

    it('decodes controller call outputs', () => {
        assert.strictEqual(decodedBoolean({ 0: true }), true)
        assert.strictEqual(decodedBoolean({ 0: false }), false)
        assert.strictEqual(decodedNumber({ 0: '10' }), 10)
        assert.strictEqual(decodedNumber({ 0: 10 }), 10)
        assert.strictEqual(decodedNumber({ 0: {} }), 0)
        assert.strictEqual(decodedString({ commitment: '0x1234' }, 'commitment'), '0x1234')
        assert.strictEqual(decodedString({ 0: '0x5678' }, 'commitment'), '0x5678')
        assert.strictEqual(decodedString({ 0: 1234 }, 'commitment'), '')
        assert.deepStrictEqual(decodedVetDomainPrice({ 0: ['100', '7'] }), { base: '100', premium: '7' })
        const namedPrice = ['100', '7'] as unknown[] & { base: string; premium: string }
        namedPrice.base = '100'
        namedPrice.premium = '7'
        assert.deepStrictEqual(decodedVetDomainPrice({ 0: namedPrice }), { base: '100', premium: '7' })
        assert.deepStrictEqual(decodedVetDomainPrice({ base: 100, premium: 7 }), { base: '100', premium: '7' })
        assert.deepStrictEqual(decodedVetDomainPrice({ 0: {} }), { base: '0', premium: '0' })
    })

    it('builds resolver data for primary name registration', () => {
        const owner = '0x0000000000000000000000000000000000000001'
        const contracts = getVetDomainContracts(genesises.main.id)!
        const setAddrFunc = new abi.Function(vetDomainSetAddrABI)
        const params = {
            name: 'alice',
            owner,
            duration: yearsToDuration(1),
            secret: `0x${'22'.repeat(32)}`,
            resolver: contracts.resolver,
            setAsPrimary: true
        }
        const resolverData = buildVetDomainResolverData(params)

        assert.strictEqual(vetDomainFullName('Alice.VET'), 'alice.vet')
        assert.strictEqual(resolverData.length, 1)
        assert.strictEqual(resolverData[0], setAddrFunc.encode(vetDomainNamehash('alice.vet'), owner))
        assert.deepStrictEqual(vetDomainCommitmentArgs(params).slice(5), [resolverData, true, 0])
    })

    it('builds commit and register clauses', () => {
        const contracts = getVetDomainContracts(genesises.main.id)!
        const commitment = `0x${'11'.repeat(32)}`
        const commitClause = buildVetDomainCommitClause(contracts, commitment)
        const commitFunc = new abi.Function(vetDomainCommitABI)

        assert.strictEqual(commitClause.to, contracts.controller)
        assert.strictEqual(commitClause.value, 0)
        assert.strictEqual(commitClause.data, commitFunc.encode(commitment))

        const registerClause = buildVetDomainRegisterClause(
            contracts,
            {
                name: 'alice',
                owner: '0x0000000000000000000000000000000000000001',
                duration: yearsToDuration(1),
                secret: `0x${'22'.repeat(32)}`,
                resolver: contracts.resolver,
                setAsPrimary: false
            },
            { base: '100', premium: '7' }
        )
        const registerFunc = new abi.Function(vetDomainRegisterABI)

        assert.strictEqual(registerClause.to, contracts.controller)
        assert.strictEqual(registerClause.value, '107')
        assert.strictEqual(
            registerClause.data,
            registerFunc.encode('alice', '0x0000000000000000000000000000000000000001', yearsToDuration(1), `0x${'22'.repeat(32)}`, contracts.resolver, [], false, 0)
        )
    })
})
