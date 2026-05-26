/* eslint-env mocha */
import * as assert from 'assert'
import { Transaction, secp256k1 } from 'thor-devkit'
import { countPendingTxActivities, uncompletedTxActivities } from '../src/pages/Activities/pending'
import { CONFIRMED_N, decideTxActivityStatus, parseStoredTx } from '../src/pages/ActivityStatusUpdater/status'

const signerKey = Buffer.from('1'.repeat(64), 'hex')
const gid = `0x${'0'.repeat(63)}1`

function encodedTx(blockNumber: number, expiration: number): string {
    const blockRef = `0x${blockNumber.toString(16).padStart(8, '0')}00000000`
    const tx = new Transaction({
        chainTag: 1,
        blockRef,
        expiration,
        clauses: [],
        gasPriceCoef: 0,
        gas: 21000,
        dependsOn: null,
        nonce: '0x1'
    })
    tx.signature = secp256k1.sign(tx.signingHash(), signerKey)
    return `0x${tx.encode().toString('hex')}`
}

function txGlob(overrides?: Partial<M.Activity.TxGlob>): M.Activity.TxGlob {
    return {
        id: `0x${'1'.repeat(64)}`,
        encoded: encodedTx(100, 18),
        signer: `0x${'2'.repeat(40)}`,
        origin: '',
        link: '',
        comment: '',
        receipt: null,
        ...overrides
    }
}

function receipt(blockNumber: number): Connex.Thor.Transaction.Receipt {
    return {
        gasUsed: 0,
        gasPayer: `0x${'3'.repeat(40)}`,
        paid: '0',
        reward: '0',
        reverted: false,
        outputs: [],
        meta: {
            blockID: `0x${blockNumber.toString(16).padStart(64, '0')}`,
            blockNumber,
            blockTimestamp: 0,
            txID: `0x${'4'.repeat(64)}`,
            txOrigin: `0x${'5'.repeat(40)}`
        }
    }
}

function txActivity(id: number, status: M.Activity['status'], overrides?: Partial<M.Activity.TxGlob>): M.Activity {
    return {
        id,
        gid,
        walletId: 1,
        createdTime: 0,
        status,
        type: 'tx',
        glob: txGlob(overrides)
    }
}

function certActivity(id: number, status: M.Activity['status']): M.Activity {
    return {
        id,
        gid,
        walletId: 1,
        createdTime: 0,
        status,
        type: 'cert',
        glob: {
            id: `cert-${id}`,
            encoded: '',
            signer: `0x${'6'.repeat(40)}`,
            origin: '',
            link: ''
        }
    }
}

describe('activity tx status helpers', () => {
    it('keeps a tx pending when it has no receipt and has not expired', () => {
        const storedTx = parseStoredTx(encodedTx(100, 18))

        assert.ok(storedTx)
        assert.deepStrictEqual(decideTxActivityStatus({
            glob: txGlob(),
            headNumber: storedTx.expiresAfterBlock,
            receipt: null,
            storedTx
        }), {
            values: {},
            shouldCommit: true
        })
    })

    it('stores a receipt before the confirmation threshold', () => {
        const storedTx = parseStoredTx(encodedTx(100, 18))
        const foundReceipt = receipt(120)
        const decision = decideTxActivityStatus({
            glob: txGlob(),
            headNumber: foundReceipt.meta.blockNumber + CONFIRMED_N - 1,
            receipt: foundReceipt,
            storedTx
        })

        assert.strictEqual(decision.shouldCommit, false)
        assert.deepStrictEqual(decision.values, {
            glob: { ...txGlob(), receipt: foundReceipt }
        })

        assert.deepStrictEqual(decideTxActivityStatus({
            glob: txGlob({ receipt: foundReceipt }),
            headNumber: foundReceipt.meta.blockNumber + CONFIRMED_N - 1,
            receipt: foundReceipt,
            storedTx
        }).values, {})
    })

    it('completes a tx at the confirmation threshold', () => {
        const storedTx = parseStoredTx(encodedTx(100, 18))
        const foundReceipt = receipt(120)
        const decision = decideTxActivityStatus({
            glob: txGlob(),
            headNumber: foundReceipt.meta.blockNumber + CONFIRMED_N,
            receipt: foundReceipt,
            storedTx
        })

        assert.strictEqual(decision.shouldCommit, false)
        assert.strictEqual(decision.values.status, 'completed')
        assert.deepStrictEqual(decision.values.glob, { ...txGlob(), receipt: foundReceipt })
    })

    it('completes an expired tx with no receipt', () => {
        const storedTx = parseStoredTx(encodedTx(100, 18))

        assert.ok(storedTx)
        assert.deepStrictEqual(decideTxActivityStatus({
            glob: txGlob(),
            headNumber: storedTx.expiresAfterBlock + 1,
            receipt: null,
            storedTx
        }), {
            values: { status: 'completed' },
            shouldCommit: false
        })
    })

    it('completes malformed stored tx activity safely', () => {
        const storedTx = parseStoredTx('0x123')

        assert.strictEqual(storedTx, null)
        assert.deepStrictEqual(decideTxActivityStatus({
            glob: txGlob({ encoded: '0x123' }),
            headNumber: 0,
            receipt: null,
            storedTx
        }), {
            values: { status: 'completed' },
            shouldCommit: false
        })
    })
})

describe('pending activity helpers', () => {
    it('counts only unmined and unexpired tx activities', () => {
        assert.deepStrictEqual(uncompletedTxActivities([
            txActivity(1, ''),
            txActivity(2, 'completed'),
            certActivity(3, '')
        ]).map(activity => activity.id), [1])

        assert.strictEqual(countPendingTxActivities([
            txActivity(1, ''),
            txActivity(2, 'completed'),
            txActivity(3, '', { receipt: receipt(110) }),
            txActivity(4, '', { encoded: encodedTx(100, 18) }),
            certActivity(5, ''),
            certActivity(6, 'completed')
        ], activity => activity.id === 4 ? 200 : 100), 1)
    })
})
