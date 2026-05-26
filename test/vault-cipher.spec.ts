/* eslint-env mocha */
import * as assert from 'assert'
import { Vault, decrypt, encrypt } from '../src/core/vault'

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
})
