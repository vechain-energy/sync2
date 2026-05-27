/* eslint-env mocha */
import * as assert from 'assert'
import { BigNumber } from 'bignumber.js'
import { address, HDNode, secp256k1, Transaction } from 'thor-devkit'
import { genesises } from '../src/consts'
import { Vault, encrypt } from '../src/core/vault'
import { buildDynamicFeeTxBody } from '../src/pages/Sign/fee-market'
import { isSoftwareWalletType, signHashWithSoftwareWallet } from '../src/pages/Sign/software-signer'
import { unlockPrivateKeyForBackup } from '../src/utils/private-key-backup'
import {
    formatPrivateKey,
    isPrivateKey,
    normalizePrivateKey,
    parsePrivateKey,
    privateKeyToAddress
} from '../src/utils/private-key'

const VALID_PRIVATE_KEY = '0000000000000000000000000000000000000000000000000000000000000001'
const VALID_PAYER_PRIVATE_KEY = '0000000000000000000000000000000000000000000000000000000000000002'
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
        assert.strictEqual(isPrivateKey(`0x${VALID_PRIVATE_KEY}`), true)
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

    it('rejects backup requests that cannot expose a matching private key', () => {
        const privateKey = parsePrivateKey(VALID_PRIVATE_KEY)
        const umk = Buffer.alloc(32, 8)
        const staticVault = Vault.createStatic(privateKey, umk)
        const targetAddress = staticVault.derive(0).address
        const ledger = testWallet(staticVault, 'ledger', [targetAddress])
        const invalidEntity = JSON.parse(staticVault.encode()) as Record<string, unknown>
        invalidEntity.cipherGlob = JSON.stringify(encrypt(Buffer.from([1]), umk))
        const hdVault = Vault.createHD(TEST_MNEMONIC, umk)
        const invalidPathEntity = JSON.parse(hdVault.encode()) as Record<string, unknown>
        invalidPathEntity.path = 'bad path'

        assert.throws(
            () => unlockPrivateKeyForBackup(ledger, targetAddress, 0, umk),
            /ledger wallets do not expose private keys/
        )
        assert.throws(
            () => unlockPrivateKeyForBackup({ ...ledger, meta: { ...ledger.meta, type: 'hd' }, vault: '"bad"' }, targetAddress, 0, umk),
            /invalid vault/
        )
        assert.throws(
            () => unlockPrivateKeyForBackup({ ...ledger, meta: { ...ledger.meta, type: 'hd' }, vault: '{}' }, targetAddress, 0, umk),
            /invalid vault/
        )
        assert.throws(
            () => unlockPrivateKeyForBackup({ ...ledger, meta: { ...ledger.meta, type: 'hd' } }, `0x${'9'.repeat(40)}`, 0, umk),
            /private key could not be matched/
        )
        assert.throws(
            () => unlockPrivateKeyForBackup(
                testWallet(Vault.decode(JSON.stringify(invalidPathEntity)), 'hd', [hdVault.derive(0).address]),
                `0x${'8'.repeat(40)}`,
                0,
                umk
            ),
            /private key could not be matched/
        )
        assert.throws(
            () => unlockPrivateKeyForBackup({ ...ledger, meta: { ...ledger.meta, type: 'private-key' } }, `0x${'9'.repeat(40)}`, 0, umk),
            /private key does not match/
        )
        assert.throws(
            () => unlockPrivateKeyForBackup(
                { ...ledger, meta: { ...ledger.meta, type: 'private-key' }, vault: JSON.stringify(invalidEntity) },
                targetAddress,
                0,
                umk
            ),
            /private key does not match/
        )

        const hdNode = HDNode as unknown as {
            fromMnemonic: (words: string[], path: string) => {
                publicKey?: Buffer
                chainCode?: Buffer
                derive: (index: number) => { privateKey: Buffer | null }
            }
        }
        const originalFromMnemonic = hdNode.fromMnemonic
        hdNode.fromMnemonic = () => ({
            derive: () => ({ privateKey: null })
        })
        try {
            assert.throws(
                () => unlockPrivateKeyForBackup(
                    testWallet(hdVault, 'hd', [hdVault.derive(0).address]),
                    `0x${'7'.repeat(40)}`,
                    0,
                    umk
                ),
                /private key could not be matched/
            )
        } finally {
            hdNode.fromMnemonic = originalFromMnemonic
        }

        privateKey.fill(0)
    })

    it('guards unsupported software wallet signing inputs', () => {
        const wallet: M.Wallet = {
            id: 1,
            gid: genesises.main.id,
            vault: '',
            meta: {
                name: 'Ledger',
                type: 'ledger',
                addresses: []
            }
        }

        assert.strictEqual(isSoftwareWalletType('hd'), true)
        assert.strictEqual(isSoftwareWalletType('private-key'), true)
        assert.strictEqual(isSoftwareWalletType('ledger'), false)
        assert.throws(
            () => signHashWithSoftwareWallet(wallet, '0x0', Buffer.alloc(32), Buffer.alloc(32)),
            /unsupported wallet type 'ledger'/
        )
        assert.throws(
            () => signHashWithSoftwareWallet(
                { ...wallet, meta: { ...wallet.meta, type: 'private-key' } },
                '0x0',
                Buffer.alloc(32),
                Buffer.alloc(32)
            ),
            /signer not found/
        )
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

    it('signs VIP-191 transactions with a local gas payer hash', () => {
        const umk = Buffer.alloc(32, 2)
        const originVault = Vault.createStatic(parsePrivateKey(VALID_PRIVATE_KEY), umk)
        const payerVault = Vault.createStatic(parsePrivateKey(VALID_PAYER_PRIVATE_KEY), umk)
        const signer = originVault.derive(0).address
        const payer = payerVault.derive(0).address
        const originWallet = testWallet(originVault, 'private-key', [signer])
        const payerWallet = testWallet(payerVault, 'private-key', [payer])
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
        const tx = new Transaction({ ...body, reserved: { features: Transaction.DELEGATED_MASK } })

        const originSig = signHashWithSoftwareWallet(originWallet, signer, umk, tx.signingHash())
        const payerSig = signHashWithSoftwareWallet(payerWallet, payer, umk, tx.signingHash(signer))
        tx.signature = Buffer.concat([originSig, payerSig])

        assert.strictEqual(tx.origin, signer)
        assert.strictEqual(tx.delegator, payer)
    })
})
