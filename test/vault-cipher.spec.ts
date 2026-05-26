/* eslint-env mocha */
import * as assert from 'assert'
import * as Module from 'module'
import { Vault, decrypt, encrypt, kdfDecrypt, kdfEncrypt, secureRNG } from '../src/core/vault'

type ModuleWithLoad = typeof Module & {
    _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown
}

type WorkerMessage = [number, string, unknown[]]

const TEST_MNEMONIC = [
    'ignore', 'empty', 'bird', 'silly',
    'journey', 'junior', 'ripple', 'have',
    'guard', 'waste', 'between', 'tenant'
]

describe('vault cipher helpers', () => {
    it('encrypts and decrypts buffers with MAC validation', () => {
        const key = Buffer.alloc(32, 9)
        const clearText = Buffer.from('secret payload')
        const glob = encrypt(clearText, key)

        assert.notStrictEqual(glob.cipherText, clearText.toString('hex'))
        assert.strictEqual(decrypt(glob, key).toString('utf8'), 'secret payload')
        assert.throws(() => decrypt({ ...glob, mac: '00' }, key), /MAC mismatch/)
        assert.throws(() => decrypt(glob, Buffer.alloc(32, 8)), /MAC mismatch/)
    })

    it('decodes encoded vaults and rejects unsupported USB decrypts', () => {
        const key = Buffer.alloc(32, 10)
        const hdVault = Vault.createHD(TEST_MNEMONIC, key)
        const entity = JSON.parse(hdVault.encode()) as {
            pub: string
            chainCode: string
        }
        const decoded = Vault.decode(hdVault.encode())
        const usbVault = Vault.createUSB(Buffer.from(entity.pub, 'hex'), Buffer.from(entity.chainCode, 'hex'))

        assert.strictEqual(decoded.derive(0).address, hdVault.derive(0).address)
        assert.strictEqual(usbVault.derive(1).address, hdVault.derive(1).address)
        assert.throws(() => usbVault.decrypt(key), /unsupported operation/)
        assert.throws(() => usbVault.derive(0).unlock(key), /unsupported operation/)
    })

    it('rejects invalid mnemonic entropy sizes before using the worker', async () => {
        await assert.rejects(Vault.generateMnemonic(12), /invalid arg/)
        await assert.rejects(Vault.generateMnemonic(36), /invalid arg/)
        await assert.rejects(Vault.generateMnemonic(18), /invalid arg/)
    })

    it('calls the worker for random bytes and password KDF operations', async () => {
        const moduleWithLoad = require('module') as ModuleWithLoad
        const originalLoad = moduleWithLoad._load
        let mode: 'resolve' | 'idle' = 'resolve'
        let lastWorker: Worker | null = null

        class WorkerMock {
            onmessage: ((event: MessageEvent) => void) | null = null
            onerror: ((event: ErrorEvent) => void) | null = null

            constructor() {
                lastWorker = this as unknown as Worker
            }

            postMessage(message: unknown): void {
                if (mode === 'idle') {
                    return
                }

                const [seq, cmd, args] = message as WorkerMessage
                const result = cmd === 'secureRNG'
                    ? new Uint8Array(Number(args[0])).fill(5)
                    : cmd === 'kdfEstimateN'
                        ? 2
                        : new Uint8Array(32).fill(7)

                this.onmessage?.({ data: [seq, result, null] } as MessageEvent)
            }
        }

        moduleWithLoad._load = (request, parent, isMain) => {
            if (request === 'worker-loader!./worker') {
                return WorkerMock
            }

            return originalLoad(request, parent, isMain)
        }

        try {
            assert.deepStrictEqual(await secureRNG(4), Buffer.from([5, 5, 5, 5]))

            const glob = await kdfEncrypt(Buffer.from('worker secret'), 'password')
            assert.strictEqual(glob.kdf.n, 2)
            assert.strictEqual((await kdfDecrypt(glob, 'password')).toString('utf8'), 'worker secret')

            mode = 'idle'
            const pending = secureRNG(2)
            const worker = lastWorker!
            worker.onerror?.({ message: '' } as ErrorEvent)
            await assert.rejects(pending, /vault worker error/)
        } finally {
            moduleWithLoad._load = originalLoad
        }
    })
})
