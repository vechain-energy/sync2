/* eslint-env mocha */
import * as assert from 'assert'
import {
    createLedgerWorkerTask,
    LedgerOperationError,
    resolveLedgerWorkerConstructor
} from '../src/utils/ledger'
import {
    LEDGER_TIMEOUT_MESSAGE,
    LedgerWorkerCommandRequest,
    LedgerWorkerResponse,
    LedgerWorkerResult
} from '../src/utils/ledger-worker-protocol'
import type { LedgerWorkerLike } from '../src/utils/ledger'

class FakeLedgerWorker implements LedgerWorkerLike {
    onmessage: ((ev: MessageEvent<LedgerWorkerResponse>) => void) | null = null
    onerror: ((ev: ErrorEvent) => void) | null = null
    posted: unknown[] = []
    terminated = false

    postMessage(message: unknown): void {
        this.posted.push(message)
    }

    terminate(): void {
        this.terminated = true
    }

    emit(message: LedgerWorkerResponse): void {
        this.onmessage?.({ data: message } as MessageEvent<LedgerWorkerResponse>)
    }

    emitError(message: string): void {
        this.onerror?.({ message } as ErrorEvent)
    }
}

function signRequest(): LedgerWorkerCommandRequest {
    return {
        command: 'signTx',
        signer: `0x${'1'.repeat(40)}`,
        index: 0,
        payloadHex: '00'
    }
}

function postedSeq(worker: FakeLedgerWorker): number {
    const posted = worker.posted[0] as { seq: number }
    return posted.seq
}

function parseResult(result: LedgerWorkerResult): string {
    if (result.command !== 'signTx' && result.command !== 'signCert') {
        throw new Error('unexpected result')
    }
    return result.signatureHex
}

describe('ledger worker client', () => {
    it('accepts direct and default worker-loader exports', () => {
        const WorkerCtor = FakeLedgerWorker as unknown as new () => LedgerWorkerLike

        assert.strictEqual(resolveLedgerWorkerConstructor(WorkerCtor), WorkerCtor)
        assert.strictEqual(resolveLedgerWorkerConstructor({ default: WorkerCtor }), WorkerCtor)
    })

    it('resolves signatures and reports progress', async () => {
        const worker = new FakeLedgerWorker()
        const progress: string[] = []
        const task = createLedgerWorkerTask(worker, signRequest(), parseResult, status => {
            progress.push(status)
        }, 1000)
        const seq = postedSeq(worker)

        worker.emit({ seq, type: 'progress', status: 'connected' })
        worker.emit({ seq, type: 'progress', status: 'handshaked' })
        worker.emit({
            seq,
            type: 'result',
            result: {
                command: 'signTx',
                signatureHex: 'ab'
            }
        })

        assert.strictEqual(await task.promise, 'ab')
        assert.deepStrictEqual(progress, ['connected', 'handshaked'])
        assert.strictEqual(worker.terminated, true)
    })

    it('terminates and rejects timed out signing', async () => {
        const worker = new FakeLedgerWorker()
        const task = createLedgerWorkerTask(worker, signRequest(), parseResult, undefined, 5)

        await assert.rejects(task.promise, (err: unknown) => {
            return err instanceof LedgerOperationError &&
                err.code === 'timeout' &&
                err.stage === 'sign' &&
                err.message === LEDGER_TIMEOUT_MESSAGE
        })
        assert.strictEqual(worker.terminated, true)
    })

    it('terminates and rejects cancelled signing', async () => {
        const worker = new FakeLedgerWorker()
        const task = createLedgerWorkerTask(worker, signRequest(), parseResult, undefined, 1000)

        task.cancel()

        await assert.rejects(task.promise, (err: unknown) => {
            return err instanceof LedgerOperationError &&
                err.code === 'cancelled' &&
                err.message === 'cancelled'
        })
        assert.strictEqual(worker.terminated, true)
    })

    it('surfaces worker errors with action text', async () => {
        const worker = new FakeLedgerWorker()
        const task = createLedgerWorkerTask(worker, signRequest(), parseResult, undefined, 1000)
        const seq = postedSeq(worker)

        worker.emit({
            seq,
            type: 'error',
            error: {
                code: 'operation-failed',
                stage: 'sign',
                message: 'you need to reconnect Ledger and sign again.'
            }
        })

        await assert.rejects(task.promise, (err: unknown) => {
            return err instanceof LedgerOperationError &&
                err.code === 'operation-failed' &&
                err.stage === 'sign' &&
                err.message === 'you need to reconnect Ledger and sign again.'
        })
        assert.strictEqual(worker.terminated, true)
    })
})
