/* eslint-env mocha */
import * as assert from 'assert'
import { Deferred } from '../src/utils/deferred'

describe('deferred promise helper', () => {
    it('resolves and rejects from exposed callbacks', async () => {
        const resolved = new Deferred<string>()
        resolved.resolve('done')

        assert.strictEqual(await resolved, 'done')

        const rejected = new Deferred<string>()
        rejected.reject(new Error('failed'))

        await assert.rejects(rejected, /failed/)
    })

    it('falls back to Promise construction when subclass internals pass an executor', async () => {
        const DeferredPromise = Deferred as unknown as PromiseConstructor
        const promise = new DeferredPromise(resolve => {
            resolve('fallback')
        }) as Promise<string> & {
            resolve: () => void
            reject: () => void
        }

        assert.strictEqual(await promise, 'fallback')
        assert.throws(() => promise.resolve(), /Deferred\.resolve is not callable/)
        assert.throws(() => promise.reject(), /Deferred\.reject is not callable/)
    })
})
