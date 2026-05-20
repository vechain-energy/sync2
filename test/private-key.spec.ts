/* eslint-env mocha */
import * as assert from 'assert'
import { BigNumber } from 'bignumber.js'
import { address, secp256k1, Transaction } from 'thor-devkit'
import { genesises } from '../src/consts'
import { Vault } from '../src/core/vault'
import { buildDynamicFeeTxBody } from '../src/pages/Sign/fee-market'
import { signHashWithSoftwareWallet } from '../src/pages/Sign/software-signer'
import { unlockPrivateKeyForBackup } from '../src/utils/private-key-backup'
import {
    formatPrivateKey,
    isPrivateKey,
    normalizePrivateKey,
    parsePrivateKey,
    privateKeyToAddress
} from '../src/utils/private-key'

const VALID_PRIVATE_KEY = '0000000000000000000000000000000000000000000000000000000000000001'
const CURVE_ORDER = 'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'
const TEST_MNEMONIC = [
    'ignore', 'empty', 'bird', 'silly',
    'journey', 'junior', 'ripple', 'have',
    'guard', 'waste', 'between', 'tenant'
]

function testWallet(vault: Vault, type: M.Wallet.Meta['type'], addresses: string[]): M.Wallet {
    return {
        id: 1,
        gid: genesises.main.id,
        vault: vault.encode(),
        meta: {
            name: 'Test Wallet',
            type,
            addresses,
            backedUp: true
        }
    }
}

describe('private key helpers', () => {
    it('normalizes 0x-prefixed and bare hex private keys', () => {
        assert.strictEqual(normalizePrivateKey(`  0X${VALID_PRIVATE_KEY.toUpperCase()}  `), VALID_PRIVATE_KEY)
        assert.strictEqual(normalizePrivateKey(VALID_PRIVATE_KEY), VALID_PRIVATE_KEY)
        assert.strictEqual(formatPrivateKey(parsePrivateKey(VALID_PRIVATE_KEY)), `0x${VALID_PRIVATE_KEY}`)
        assert.strictEqual(formatPrivateKey(parsePrivateKey(`0x${VALID_PRIVATE_KEY}`)), `0x${VALID_PRIVATE_KEY}`)
    })

    it('rejects invalid private keys', () => {
        assert.strictEqual(isPrivateKey('0x1234'), false)
        assert.strictEqual(isPrivateKey(`0x${'00'.repeat(32)}`), false)
        assert.strictEqual(isPrivateKey(`0x${CURVE_ORDER}`), false)
        assert.strictEqual(isPrivateKey(`0x${'ff'.repeat(32)}`), false)
        assert.strictEqual(isPrivateKey(`0x${'11'.repeat(31)}xx`), false)
    })

    it('creates static vaults that expose one address only', () => {
        const privateKey = parsePrivateKey(VALID_PRIVATE_KEY)
        const umk = Buffer.alloc(32, 1)
        const vault = Vault.createStatic(privateKey, umk)
        const node = vault.derive(0)

        assert.strictEqual(node.address, privateKeyToAddress(privateKey))
        assert.strictEqual(formatPrivateKey(node.unlock(umk)), `0x${VALID_PRIVATE_KEY}`)
        assert.throws(() => vault.derive(1), /invalid node index/)
    })

    it('exports private keys from legacy HD vaults without an encoded path', () => {
        const umk = Buffer.alloc(32, 3)
        const currentVault = Vault.createHD(TEST_MNEMONIC, umk)
        const legacyEntity = JSON.parse(currentVault.encode()) as Record<string, unknown>
        delete legacyEntity.path
        const legacyVault = Vault.decode(JSON.stringify(legacyEntity))
        const currentKey = currentVault.derive(0).unlock(umk)
        const legacyKey = legacyVault.derive(0).unlock(umk)

        try {
            assert.strictEqual(formatPrivateKey(legacyKey), formatPrivateKey(currentKey))
        } finally {
            currentKey.fill(0)
            legacyKey.fill(0)
        }
    })

    it('backs up a private key by matching the selected wallet address', () => {
        const umk = Buffer.alloc(32, 4)
        const vault = Vault.createHD(TEST_MNEMONIC, umk)
        const targetAddress = vault.derive(1).address
        const wallet = testWallet(vault, 'hd', [vault.derive(0).address, targetAddress])
        const key = unlockPrivateKeyForBackup(wallet, targetAddress, 1, umk)

        try {
            assert.strictEqual(privateKeyToAddress(key), targetAddress)
        } finally {
            key.fill(0)
        }
    })

    it('backs up the selected address even when a stale route index is provided', () => {
        const umk = Buffer.alloc(32, 5)
        const vault = Vault.createHD(TEST_MNEMONIC, umk)
        const targetAddress = vault.derive(1).address
        const wallet = testWallet(vault, 'hd', [vault.derive(0).address, targetAddress])
        const key = unlockPrivateKeyForBackup(wallet, targetAddress, 0, umk)

        try {
            assert.strictEqual(privateKeyToAddress(key), targetAddress)
        } finally {
            key.fill(0)
        }
    })

    it('backs up private keys from legacy ETH-path vaults without an encoded path', () => {
        const umk = Buffer.alloc(32, 6)
        // eslint-disable-next-line quotes
        const vault = Vault.createHD(TEST_MNEMONIC, umk, `m/44'/60'/0'/0`)
        const legacyEntity = JSON.parse(vault.encode()) as Record<string, unknown>
        delete legacyEntity.path
        const legacyVault = Vault.decode(JSON.stringify(legacyEntity))
        const targetAddress = vault.derive(0).address
        const wallet = testWallet(legacyVault, 'hd', [targetAddress])
        const key = unlockPrivateKeyForBackup(wallet, targetAddress, 0, umk)

        try {
            assert.strictEqual(privateKeyToAddress(key), targetAddress)
        } finally {
            key.fill(0)
        }
    })

    it('backs up private-key wallets from the static vault', () => {
        const privateKey = parsePrivateKey(VALID_PRIVATE_KEY)
        const umk = Buffer.alloc(32, 7)
        const vault = Vault.createStatic(privateKey, umk)
        const targetAddress = vault.derive(0).address
        const wallet = testWallet(vault, 'private-key', [targetAddress])
        const key = unlockPrivateKeyForBackup(wallet, targetAddress, 0, umk)

        try {
            assert.strictEqual(formatPrivateKey(key), `0x${VALID_PRIVATE_KEY}`)
        } finally {
            privateKey.fill(0)
            key.fill(0)
        }
    })

    it('signs dynamic fee transactions with private-key wallets', () => {
        const privateKey = parsePrivateKey(VALID_PRIVATE_KEY)
        const umk = Buffer.alloc(32, 2)
        const vault = Vault.createStatic(privateKey, umk)
        const signer = vault.derive(0).address
        const wallet: M.Wallet = {
            id: 1,
            gid: genesises.main.id,
            vault: vault.encode(),
            meta: {
                name: 'Private Key',
                type: 'private-key',
                addresses: [signer],
                backedUp: true
            }
        }
        const body = buildDynamicFeeTxBody(
            genesises.main.id,
            '0x017b6e328c3e15b0d24376289af68e70326fbb37b339a341e06c3d000fb17ff3',
            [{
                to: '0x0000000000000000000000000000000000000001',
                value: '1',
                data: '0x'
            }],
            21000,
            new BigNumber(10),
            new BigNumber(210),
            undefined,
            '0x01'
        )
        const tx = new Transaction(body)
        const signature = signHashWithSoftwareWallet(wallet, signer, umk, tx.signingHash())
        const recovered = address.fromPublicKey(secp256k1.recover(tx.signingHash(), signature))

        assert.strictEqual(body.type, Transaction.Type.DynamicFee)
        assert.strictEqual(recovered, signer)
    })
})
