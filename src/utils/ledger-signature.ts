type BufferJson = {
    type: 'Buffer'
    data: number[]
}

function isBufferJson(value: unknown): value is BufferJson {
    if (typeof value !== 'object' || value === null) {
        return false
    }

    const record = value as Record<string, unknown>
    return record.type === 'Buffer' &&
        Array.isArray(record.data) &&
        record.data.every(item => Number.isInteger(item) && item >= 0 && item <= 255)
}

export function normalizeLedgerSignature(value: unknown): Buffer {
    let signature: Buffer | null = null

    if (Buffer.isBuffer(value)) {
        signature = value
    } else if (value instanceof Uint8Array) {
        signature = Buffer.from(value.buffer, value.byteOffset, value.byteLength)
    } else if (isBufferJson(value)) {
        signature = Buffer.from(value.data)
    }

    if (!signature || signature.length !== 65) {
        throw new Error('you need to reconnect Ledger and sign again. Ledger returned invalid signature data.')
    }

    return signature
}
