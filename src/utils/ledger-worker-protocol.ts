import type { Account } from '@vechain/hw-app-vet'

export const LEDGER_TIMEOUT_MS = 120000
export const LEDGER_TIMEOUT_MESSAGE = 'you need to reconnect Ledger and sign again.'

// eslint-disable-next-line quotes
export const ledgerPath = `44'/818'/0'/0`

export type LedgerProgressStatus = 'connected' | 'handshaked' | 'signed' | 'done'
export type LedgerOperationStage = 'connect' | 'account' | 'sign'
export type LedgerErrorCode = 'cancelled' | 'operation-failed' | 'timeout' | 'wrong-device'

export type LedgerAccountData = Account & {
    chainCode: string
}

export type LedgerWorkerSignRequest = {
    command: 'signTx' | 'signCert'
    signer: string
    index: number
    payloadHex: string
}

export type LedgerWorkerCommandRequest = {
    command: 'link'
} | LedgerWorkerSignRequest

export type LedgerWorkerRequest = LedgerWorkerCommandRequest & {
    seq: number
}

export type LedgerWorkerResult = {
    command: 'link'
    account: LedgerAccountData
} | {
    command: 'signTx' | 'signCert'
    signatureHex: string
}

export type LedgerWorkerError = {
    code: LedgerErrorCode
    stage: LedgerOperationStage
    message: string
}

export type LedgerWorkerResponse = {
    seq: number
    type: 'progress'
    status: LedgerProgressStatus
} | {
    seq: number
    type: 'result'
    result: LedgerWorkerResult
} | {
    seq: number
    type: 'error'
    error: LedgerWorkerError
}
