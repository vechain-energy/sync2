/* eslint-env mocha */
import * as assert from 'assert'
import { abi } from 'thor-devkit'
import { abis, genesises } from '../src/consts'
import {
    STANDARD_FEE_MODE,
    buildGenericDelegatorPaymentClause,
    calcGenericGasTokenRequiredBalance,
    genericDelegatorDepositUrl,
    genericDelegatorEstimateUrl,
    genericDelegatorSignUrl,
    genericFeeModeFor,
    getGenericDelegatorUrl,
    getGenericGasTokenSpec,
    parseGenericDelegatorEstimate,
    shouldShowGenericFeeOptions,
    speedFromFeePriority
} from '../src/pages/Sign/generic-delegator'

const depositAccount = '0xf077b491b355e64048ce21e3a6fc4751eeea77fa'

const estimateResponse = {
    estimatedGas: {
        vtho: 67582,
        vet: 37000,
        b3tr: 55910,
        smartAccount: 0
    },
    transactionCost: {
        regular: {
            vtho: 0.83632725,
            vet: 0.03634974169500393,
            b3tr: 0.027316085679048967
        },
        medium: {
            vtho: 0.83632725,
            vet: 0.03634974169500393,
            b3tr: 0.027316085679048967
        },
        high: {
            vtho: 0.83632725,
            vet: 0.03634974169500393,
            b3tr: 0.027316085679048967
        }
    },
    serviceFee: 0.1
}

function tokenTransferClause(token: M.TokenSpec, to: string, amount: string): Connex.Vendor.TxMessage[0] {
    return {
        to: token.address,
        value: 0,
        data: new abi.Function(abis.transfer).encode(to, amount)
    }
}

function decodeTransfer(clause: Connex.Vendor.TxMessage[0]) {
    return abi.decodeParameters(abis.transfer.inputs, '0x' + clause.data!.slice(new abi.Function(abis.transfer).signature.length))
}

describe('generic delegator helpers', () => {
    it('maps delegator URLs by genesis only for mainnet and testnet', () => {
        assert.strictEqual(getGenericDelegatorUrl(genesises.main.id), 'https://mainnet.delegator.vechain.org/api/v1/')
        assert.strictEqual(getGenericDelegatorUrl(genesises.test.id), 'https://testnet.delegator.vechain.org/api/v1/')
        assert.strictEqual(getGenericDelegatorUrl('0x0'), null)
    })

    it('builds Generic Delegator endpoint URLs', () => {
        const baseUrl = getGenericDelegatorUrl(genesises.test.id)!
        assert.strictEqual(
            genericDelegatorEstimateUrl(baseUrl, 'VET', 'medium'),
            'https://testnet.delegator.vechain.org/api/v1/estimate/clauses/vet?type=transaction&speed=medium'
        )
        assert.strictEqual(genericDelegatorDepositUrl(baseUrl), 'https://testnet.delegator.vechain.org/api/v1/deposit/account')
        assert.strictEqual(genericDelegatorSignUrl(baseUrl, 'B3TR'), 'https://testnet.delegator.vechain.org/api/v1/sign/transaction/b3tr')
    })

    it('parses regular, medium, and high token estimates', () => {
        assert.strictEqual(speedFromFeePriority(100), 'regular')
        assert.strictEqual(speedFromFeePriority(150), 'medium')
        assert.strictEqual(speedFromFeePriority(200), 'high')

        const vet = parseGenericDelegatorEstimate(estimateResponse, 'VET', 'regular')
        const b3tr = parseGenericDelegatorEstimate(estimateResponse, 'B3TR', 'medium')
        const vtho = parseGenericDelegatorEstimate(estimateResponse, 'VTHO', 'high')

        assert.strictEqual(vet.gas, 37000)
        assert.strictEqual(vet.amountWei, '36349741695003930')
        assert.strictEqual(b3tr.gas, 55910)
        assert.strictEqual(b3tr.amountWei, '27316085679048967')
        assert.strictEqual(vtho.gas, 67582)
        assert.strictEqual(vtho.amountWei, '836327250000000000')
    })

    it('builds VET payment clauses', () => {
        const vet = getGenericGasTokenSpec(genesises.main.id, [], 'VET')!
        const clause = buildGenericDelegatorPaymentClause('VET', vet, depositAccount, '100')

        assert.strictEqual(clause.to, depositAccount)
        assert.strictEqual(clause.value, '100')
        assert.strictEqual(clause.data, '0x')
    })

    it('builds B3TR and VTHO transfer payment clauses', () => {
        const b3tr = getGenericGasTokenSpec(genesises.test.id, [], 'B3TR')!
        const vtho = getGenericGasTokenSpec(genesises.test.id, [], 'VTHO')!
        const b3trClause = buildGenericDelegatorPaymentClause('B3TR', b3tr, depositAccount, '200')
        const vthoClause = buildGenericDelegatorPaymentClause('VTHO', vtho, depositAccount, '300')

        assert.strictEqual(b3trClause.to, b3tr.address)
        assert.strictEqual(vthoClause.to, vtho.address)
        assert.strictEqual(decodeTransfer(b3trClause)._to, depositAccount)
        assert.strictEqual(decodeTransfer(b3trClause)._value, '200')
        assert.strictEqual(decodeTransfer(vthoClause)._to, depositAccount)
        assert.strictEqual(decodeTransfer(vthoClause)._value, '300')
    })

    it('includes same-token outgoing transfer in required balance checks', () => {
        const b3tr = getGenericGasTokenSpec(genesises.test.id, [], 'B3TR')!
        assert.strictEqual(
            calcGenericGasTokenRequiredBalance([{
                to: '0x0000000000000000000000000000000000000001',
                value: '50',
                data: '0x'
            }], 'VET', getGenericGasTokenSpec(genesises.test.id, [], 'VET')!, '10').toString(),
            '60'
        )
        assert.strictEqual(
            calcGenericGasTokenRequiredBalance([
                tokenTransferClause(b3tr, '0x0000000000000000000000000000000000000001', '15')
            ], 'B3TR', b3tr, '10').toString(),
            '25'
        )
    })

    it('keeps standard VTHO as default and hides generic mode for dApp delegation', () => {
        assert.strictEqual(STANDARD_FEE_MODE, 'standard-vtho')
        assert.strictEqual(genericFeeModeFor('VET'), 'generic-vet')
        assert.strictEqual(shouldShowGenericFeeOptions(genesises.main.id, false), true)
        assert.strictEqual(shouldShowGenericFeeOptions(genesises.main.id, true), false)
        assert.strictEqual(shouldShowGenericFeeOptions('0x0', false), false)
    })
})
