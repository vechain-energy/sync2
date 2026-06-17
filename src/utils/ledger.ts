import type Transport from '@ledgerhq/hw-transport'
import LedgerApp, { StatusCodes } from '@vechain/hw-app-vet'
import type { Account } from '@vechain/hw-app-vet'
import { HDNode } from 'thor-devkit'
import { Deferred } from './deferred'
import { normalizeLedgerSignature } from './ledger-signature'
import {
    LEDGER_TIMEOUT_MESSAGE,
    LEDGER_TIMEOUT_MS,
    ledgerPath,
    LedgerAccountData,
    LedgerErrorCode,
    LedgerOperationStage,
    LedgerProgressStatus,
    LedgerWorkerCommandRequest,
    LedgerWorkerError,
    LedgerWorkerResponse,
    LedgerWorkerResult
} from './ledger-worker-protocol'

export { LedgerApp as App, StatusCodes }
export type { Account }
export type { LedgerProgressStatus }

export type LedgerTask<T> = {
    promise: Promise<T>
    cancel(): void
}

export type LedgerSignArg = {
    signer: string
    index: number
    payload: Buffer
}

export type LedgerProgressHandler = (status: LedgerProgressStatus) => void

export type LedgerWorkerLike = {
    onmessage: ((ev: MessageEvent<LedgerWorkerResponse>) => void) | null
    onerror: ((ev: ErrorEvent) => void) | null
    postMessage(message: unknown): void
    terminate(): void
}

type LedgerWorkerConstructor = new () => LedgerWorkerLike

export class LedgerOperationError extends Error {
    constructor(
        readonly stage: LedgerOperationStage,
        readonly code: LedgerErrorCode,
        message: string
    ) {
        super(message)
        this.name = 'LedgerOperationError'
    }
}

const connector: { connect(): Promise<Transport> } | null = (() => {
    if (process.env.MODE === 'electron') {
        return {
            connect: () => require('@ledgerhq/hw-transport-node-hid-noevents').default.open('')
        }
    } else if (process.env.MODE === 'spa' || process.env.MODE === 'pwa') {
        if (typeof window !== 'undefined' && 'hid' in window.navigator) {
            return {
                connect: () => require('@ledgerhq/hw-transport-webhid').default.create()
            }
        }
    }
    return null
})()

export const supported = !!connector

export const path = ledgerPath

export function connect() {
    if (!connector) {
        throw new Error('unsupported')
    }
    return connector.connect()
}

export function resolveLedgerWorkerConstructor(moduleValue: unknown): LedgerWorkerConstructor {
    if (typeof moduleValue === 'function') {
        return moduleValue as LedgerWorkerConstructor
    }

    if (moduleValue && typeof moduleValue === 'object' && 'default' in moduleValue) {
        const defaultExport = (moduleValue as { default?: unknown }).default
        if (typeof defaultExport === 'function') {
            return defaultExport as LedgerWorkerConstructor
        }
    }

    throw new Error('Ledger worker unavailable')
}

function createLedgerWorker(): LedgerWorkerLike {
    if (process.env.MODE === 'electron') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const WorkerClass = resolveLedgerWorkerConstructor(require('worker-loader!./ledger-worker'))
        return new WorkerClass()
    }
    throw new Error('Ledger worker unavailable')
}

function errorMessage(err: unknown): string {
    return err instanceof Error && err.message ? err.message : 'Ledger operation failed'
}

function operationError(err: unknown, stage: LedgerOperationStage): LedgerOperationError {
    if (err instanceof LedgerOperationError) {
        return err
    }
    return new LedgerOperationError(stage, 'operation-failed', errorMessage(err))
}

function workerError(err: LedgerWorkerError): LedgerOperationError {
    return new LedgerOperationError(err.stage, err.code, err.message)
}

function timeoutStage(command: LedgerWorkerCommandRequest['command']): LedgerOperationStage {
    return command === 'link' ? 'account' : 'sign'
}

let nextSeq = 0

export function createLedgerWorkerTask<T>(
    worker: LedgerWorkerLike,
    request: LedgerWorkerCommandRequest,
    parseResult: (result: LedgerWorkerResult) => T,
    onProgress?: LedgerProgressHandler,
    timeoutMs = LEDGER_TIMEOUT_MS
): LedgerTask<T> {
    const seq = ++nextSeq
    let settled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let finishTask: ((result: T | LedgerOperationError, ok: boolean) => void) | null = null

    const promise = new Promise<T>((resolve, reject) => {
        const finish = (result: T | LedgerOperationError, ok: boolean) => {
            if (settled) {
                return
            }
            settled = true
            if (timer) {
                clearTimeout(timer)
                timer = null
            }
            worker.terminate()
            if (ok) {
                resolve(result as T)
            } else {
                reject(result)
            }
        }
        finishTask = finish

        timer = setTimeout(() => {
            finish(new LedgerOperationError(timeoutStage(request.command), 'timeout', LEDGER_TIMEOUT_MESSAGE), false)
        }, timeoutMs)

        worker.onmessage = ev => {
            const message = ev.data
            if (message.seq !== seq) {
                return
            }

            if (message.type === 'progress') {
                onProgress?.(message.status)
                return
            }

            if (message.type === 'error') {
                finish(workerError(message.error), false)
                return
            }

            try {
                finish(parseResult(message.result), true)
            } catch (err) {
                finish(operationError(err, timeoutStage(request.command)), false)
            }
        }

        worker.onerror = ev => {
            finish(new LedgerOperationError(timeoutStage(request.command), 'operation-failed', ev.message || 'Ledger worker failed'), false)
        }

        try {
            worker.postMessage({ ...request, seq })
        } catch (err) {
            finish(operationError(err, timeoutStage(request.command)), false)
        }
    })

    return {
        promise,
        cancel() {
            if (settled) {
                return
            }
            finishTask?.(new LedgerOperationError(timeoutStage(request.command), 'cancelled', 'cancelled'), false)
        }
    }
}

function accountFromResult(result: LedgerWorkerResult): LedgerAccountData {
    if (result.command !== 'link') {
        throw new Error('Ledger worker returned unexpected result')
    }
    return result.account
}

function signatureFromResult(result: LedgerWorkerResult): Buffer {
    if (result.command !== 'signTx' && result.command !== 'signCert') {
        throw new Error('Ledger worker returned unexpected result')
    }
    return normalizeLedgerSignature(Buffer.from(result.signatureHex, 'hex'))
}

function closeTransport(transport: Transport | null): void {
    if (!transport) {
        return
    }
    void transport.close().catch(() => { })
}

function createDirectTask<T>(
    run: (race: <R>(promise: Promise<R>) => Promise<R>) => Promise<T>,
    stage: LedgerOperationStage,
    timeoutMs: number
): LedgerTask<T> {
    const signal = new Deferred<never>()
    let settled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const promise = new Promise<T>((resolve, reject) => {
        timer = setTimeout(() => {
            signal.reject(new LedgerOperationError(stage, 'timeout', LEDGER_TIMEOUT_MESSAGE))
        }, timeoutMs)

        const finish = (done: () => void) => {
            if (settled) {
                return
            }
            settled = true
            if (timer) {
                clearTimeout(timer)
                timer = null
            }
            done()
        }

        const race = <R>(item: Promise<R>) => Promise.race([item, signal])

        run(race)
            .then(result => finish(() => resolve(result)))
            .catch(err => finish(() => reject(operationError(err, stage))))
    })

    return {
        promise,
        cancel() {
            if (settled) {
                return
            }
            signal.reject(new LedgerOperationError(stage, 'cancelled', 'cancelled'))
        }
    }
}

function accountWithChainCode(account: Account): LedgerAccountData {
    if (!account.chainCode) {
        throw new LedgerOperationError('account', 'operation-failed', 'Ledger did not return chain code')
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
        throw new LedgerOperationError('account', 'wrong-device', 'Wrong device')
    }
}

function getAccountDirect(onProgress?: LedgerProgressHandler, timeoutMs = LEDGER_TIMEOUT_MS): LedgerTask<LedgerAccountData> {
    return createDirectTask(async race => {
        let transport: Transport | null = null
        try {
            transport = await race(connect())
            onProgress?.('connected')
            const app = new LedgerApp(transport)
            const account = accountWithChainCode(await race(app.getAccount(ledgerPath, false, true)))
            onProgress?.('done')
            return account
        } finally {
            closeTransport(transport)
        }
    }, 'account', timeoutMs)
}

function signDirect(
    command: 'signTx' | 'signCert',
    arg: LedgerSignArg,
    onProgress?: LedgerProgressHandler,
    timeoutMs = LEDGER_TIMEOUT_MS
): LedgerTask<Buffer> {
    return createDirectTask(async race => {
        let transport: Transport | null = null
        try {
            transport = await race(connect())
            onProgress?.('connected')

            const app = new LedgerApp(transport)
            const account = accountWithChainCode(await race(app.getAccount(ledgerPath, false, true)))
            verifySigner(account, arg.index, arg.signer)
            onProgress?.('handshaked')

            const signPath = `${ledgerPath}/${arg.index}`
            const signature = command === 'signTx'
                ? await race(app.signTransaction(signPath, arg.payload))
                : await race(app.signJSON(signPath, arg.payload))
            onProgress?.('signed')
            return normalizeLedgerSignature(signature)
        } finally {
            closeTransport(transport)
        }
    }, 'sign', timeoutMs)
}

function getAccountWorker(onProgress?: LedgerProgressHandler, timeoutMs = LEDGER_TIMEOUT_MS): LedgerTask<LedgerAccountData> {
    return createLedgerWorkerTask(
        createLedgerWorker(),
        { command: 'link' },
        accountFromResult,
        onProgress,
        timeoutMs
    )
}

function signWorker(
    command: 'signTx' | 'signCert',
    arg: LedgerSignArg,
    onProgress?: LedgerProgressHandler,
    timeoutMs = LEDGER_TIMEOUT_MS
): LedgerTask<Buffer> {
    return createLedgerWorkerTask(
        createLedgerWorker(),
        {
            command,
            signer: arg.signer,
            index: arg.index,
            payloadHex: arg.payload.toString('hex')
        },
        signatureFromResult,
        onProgress,
        timeoutMs
    )
}

function useWorker(): boolean {
    return process.env.MODE === 'electron'
}

export function getAccount(onProgress?: LedgerProgressHandler, timeoutMs = LEDGER_TIMEOUT_MS): LedgerTask<LedgerAccountData> {
    return useWorker() ? getAccountWorker(onProgress, timeoutMs) : getAccountDirect(onProgress, timeoutMs)
}

export function signTransaction(arg: LedgerSignArg, onProgress?: LedgerProgressHandler, timeoutMs = LEDGER_TIMEOUT_MS): LedgerTask<Buffer> {
    return useWorker() ? signWorker('signTx', arg, onProgress, timeoutMs) : signDirect('signTx', arg, onProgress, timeoutMs)
}

export function signJSON(arg: LedgerSignArg, onProgress?: LedgerProgressHandler, timeoutMs = LEDGER_TIMEOUT_MS): LedgerTask<Buffer> {
    return useWorker() ? signWorker('signCert', arg, onProgress, timeoutMs) : signDirect('signCert', arg, onProgress, timeoutMs)
}
