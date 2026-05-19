/* eslint-env mocha */
import * as assert from 'assert'
import { resolveWorkerConstructor } from '../src/core/vault/cipher'

describe('vault worker loader', () => {
    it('accepts direct and default worker-loader exports', () => {
        const WorkerCtor = function WorkerMock() {
            return {} as Worker
        } as unknown as new () => Worker

        assert.strictEqual(resolveWorkerConstructor(WorkerCtor), WorkerCtor)
        assert.strictEqual(resolveWorkerConstructor({ default: WorkerCtor }), WorkerCtor)
    })

    it('rejects invalid worker-loader exports', () => {
        assert.throws(() => resolveWorkerConstructor({}), /vault worker unavailable/)
        assert.throws(() => resolveWorkerConstructor({ default: {} }), /vault worker unavailable/)
    })
})
