// codes in this file run in web worker

import type Transport from '@ledgerhq/hw-transport'
import LedgerApp from '@vechain/hw-app-vet'
import type { Account } from '@vechain/hw-app-vet'
import { HDNode } from 'thor-devkit'
import { normalizeLedgerSignature } from './ledger-signature'
import {
    ledgerPath,
    LedgerAccountData,
    LedgerErrorCode,
    LedgerOperationStage,
    LedgerProgressStatus,
    LedgerWorkerError,
    LedgerWorkerRequest,
    LedgerWorkerResponse
} from './ledger-worker-protocol'

type NodeHidTransport = {
    open(path: string): Promise<Transport>
}

type NodeHidModule = {
    default: NodeHidTransport
}

class LedgerWorkerFailure extends Error {
    constructor(
        readonly stage: LedgerOperationStage,
        readonly code: LedgerErrorCode,
        message: string
    ) {
        super(message)
        this.name = 'LedgerWorkerFailure'
    }
}

function errorMessage(err: unknown): string {
    return err instanceof Error && err.message ? err.message : 'Ledger operation failed'
}

function errorPayload(err: unknown, stage: LedgerOperationStage): LedgerWorkerError {
    if (err instanceof LedgerWorkerFailure) {
        return {
            code: err.code,
            stage: err.stage,
            message: err.message
        }
    }

    return {
        code: 'operation-failed',
        stage,
        message: errorMessage(err)
    }
}

function connect(): Promise<Transport> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const moduleValue = require('@ledgerhq/hw-transport-node-hid-noevents') as NodeHidModule
    return moduleValue.default.open('')
}

function accountWithChainCode(account: Account): LedgerAccountData {
    if (!account.chainCode) {
        throw new LedgerWorkerFailure('account', 'operation-failed', 'Ledger did not return chain code')
    }
    return {
        publicKey: account.publicKey,
        address: account.address,
        chainCode: account.chainCode
    }
}

function verifySigner(account: LedgerAccountData, index: number, signer: string): void {
    const root = HDNode.fromPublicKey(Buffer.from(account.publicKey, 'hex'), Buffer.from(account.chainCode, 'hex'))
    const node = root.derive(index)

    if (signer.toLowerCase() !== node.address.toLowerCase()) {
        throw new LedgerWorkerFailure('account', 'wrong-device', 'Wrong device')
    }
}

function postProgress(seq: number, status: LedgerProgressStatus): void {
    postResponse({
        seq,
        type: 'progress',
        status
    })
}

function postResponse(response: LedgerWorkerResponse): void {
    ctx.postMessage(response)
}

function closeTransport(transport: Transport | null): void {
    if (!transport) {
        return
    }
    void transport.close().catch(() => { })
}

async function handleLink(req: LedgerWorkerRequest): Promise<void> {
    let transport: Transport | null = null
    let stage: LedgerOperationStage = 'connect'
    try {
        transport = await connect()
        postProgress(req.seq, 'connected')

        stage = 'account'
        const app = new LedgerApp(transport)
        const account = accountWithChainCode(await app.getAccount(ledgerPath, false, true))
        postProgress(req.seq, 'done')
        postResponse({
            seq: req.seq,
            type: 'result',
            result: {
                command: 'link',
                account
            }
        })
    } catch (err) {
        postResponse({
            seq: req.seq,
            type: 'error',
            error: errorPayload(err, stage)
        })
    } finally {
        closeTransport(transport)
    }
}

async function handleSign(req: LedgerWorkerRequest & { command: 'signTx' | 'signCert' }): Promise<void> {
    let transport: Transport | null = null
    let stage: LedgerOperationStage = 'connect'
    try {
        transport = await connect()
        postProgress(req.seq, 'connected')

        stage = 'account'
        const app = new LedgerApp(transport)
        const account = accountWithChainCode(await app.getAccount(ledgerPath, false, true))
        verifySigner(account, req.index, req.signer)
        postProgress(req.seq, 'handshaked')

        stage = 'sign'
        const path = `${ledgerPath}/${req.index}`
        const payload = Buffer.from(req.payloadHex, 'hex')
        const signature = req.command === 'signTx'
            ? await app.signTransaction(path, payload)
            : await app.signJSON(path, payload)
        postProgress(req.seq, 'signed')
        postResponse({
            seq: req.seq,
            type: 'result',
            result: {
                command: req.command,
                signatureHex: normalizeLedgerSignature(signature).toString('hex')
            }
        })
    } catch (err) {
        postResponse({
            seq: req.seq,
            type: 'error',
            error: errorPayload(err, stage)
        })
    } finally {
        closeTransport(transport)
    }
}

async function handleRequest(req: LedgerWorkerRequest): Promise<void> {
    switch (req.command) {
        case 'link':
            await handleLink(req)
            break
        case 'signTx':
        case 'signCert':
            await handleSign(req)
            break
        default:
            throw new Error('Unknown Ledger worker command')
    }
}

const ctx: Worker = self as never
ctx.onmessage = ev => {
    const req = ev.data as LedgerWorkerRequest
    void handleRequest(req)
}
