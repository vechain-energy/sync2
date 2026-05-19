/* eslint-env mocha */
import * as assert from 'assert'
import { abi } from 'thor-devkit'
import { genesises } from '../src/consts'
import {
    buildVetDomainCommitClause,
    buildVetDomainRegisterClause,
    getVetDomainContracts,
    isBasicRegistrationName,
    normalizeRegistrationName,
    sumVetDomainPrice,
    vetDomainCommitABI,
    vetDomainRegisterABI,
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
                resolver: contracts.resolver
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
