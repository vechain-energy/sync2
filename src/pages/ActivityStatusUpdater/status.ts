import { Transaction } from 'thor-devkit'

export const CONFIRMED_N = 12

const encodedTxPattern = /^0x(?:[0-9a-f]{2})+$/i

export type StoredTx = {
    id: string
    expiresAfterBlock: number
}

export type TxActivityUpdateValues = {
    status?: M.Activity['status']
    glob?: M.Activity.TxGlob
}

export type TxActivityStatusDecision = {
    values: TxActivityUpdateValues
    shouldCommit: boolean
}

export function parseStoredTx(encoded: string): StoredTx | null {
    if (!encodedTxPattern.test(encoded)) {
        return null
    }

    try {
        const tx = Transaction.decode(Buffer.from(encoded.slice(2), 'hex'))
        const id = tx.id
        const blockRef = Number.parseInt(tx.body.blockRef.slice(2, 10), 16)

        if (!id || !Number.isFinite(blockRef)) {
            return null
        }

        return {
            id,
            expiresAfterBlock: blockRef + tx.body.expiration + CONFIRMED_N
        }
    } catch {
        return null
    }
}

export function decideTxActivityStatus(params: {
    glob: M.Activity.TxGlob
    headNumber: number
    receipt: Connex.Thor.Transaction.Receipt | null
    storedTx: StoredTx | null
}): TxActivityStatusDecision {
    if (!params.storedTx) {
        return {
            values: { status: 'completed' },
            shouldCommit: false
        }
    }

    if (params.receipt) {
        const values: TxActivityUpdateValues = {}
        const storedReceipt = params.glob.receipt
        if (!storedReceipt || storedReceipt.meta.blockID !== params.receipt.meta.blockID) {
            values.glob = { ...params.glob, receipt: params.receipt }
        }
        if (params.headNumber >= params.receipt.meta.blockNumber + CONFIRMED_N) {
            values.status = 'completed'
        }
        return {
            values,
            shouldCommit: false
        }
    }

    if (params.headNumber > params.storedTx.expiresAfterBlock) {
        return {
            values: { status: 'completed' },
            shouldCommit: false
        }
    }

    return {
        values: {},
        shouldCommit: true
    }
}
