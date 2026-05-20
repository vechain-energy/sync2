import { HDNode } from 'thor-devkit'
import { Vault } from 'src/core/vault'
import { privateKeyToAddress } from 'src/utils/private-key'

// eslint-disable-next-line quotes
const VET_HD_PATH = `m/44'/818'/0'/0`
// eslint-disable-next-line quotes
const ETH_HD_PATH = `m/44'/60'/0'/0`
// eslint-disable-next-line quotes
const LEGACY_VET_ACCOUNT_PATH = `m/44'/818'/0'`
// eslint-disable-next-line quotes
const LEGACY_ETH_ACCOUNT_PATH = `m/44'/60'/0'`

type VaultEntity = {
    pub: string
    chainCode?: string
    path?: string
}

function isRecord(input: unknown): input is Record<string, unknown> {
    return typeof input === 'object' && input !== null
}

function stringField(input: Record<string, unknown>, field: string): string | undefined {
    const value = input[field]
    return typeof value === 'string' && value.length > 0 ? value : undefined
}

function decodeVaultEntity(vaultText: string): VaultEntity {
    const entity = JSON.parse(vaultText) as unknown
    if (!isRecord(entity)) {
        throw new Error('invalid vault')
    }

    const pub = stringField(entity, 'pub')
    if (!pub) {
        throw new Error('invalid vault')
    }

    return {
        pub,
        chainCode: stringField(entity, 'chainCode'),
        path: stringField(entity, 'path')
    }
}

function mnemonicWords(clearText: Buffer): string[] {
    const words = clearText
        .toString('utf8')
        .trim()
        .split(/\s+/)

    return words.filter(word => word.length > 0)
}

function sameAddress(a: string, b: string): boolean {
    return a.toLowerCase() === b.toLowerCase()
}

function privateKeyMatchesAddress(privateKey: Buffer, targetAddress: string): boolean {
    try {
        return sameAddress(privateKeyToAddress(privateKey), targetAddress)
    } catch {
        return false
    }
}

function uniqueNumbers(values: number[]): number[] {
    return [...new Set(values)]
}

function uniqueStrings(values: string[]): string[] {
    return [...new Set(values)]
}

function walletAddressIndex(wallet: M.Wallet, targetAddress: string): number {
    return wallet.meta.addresses.findIndex(address => sameAddress(address, targetAddress))
}

function candidateIndexes(wallet: M.Wallet, targetAddress: string, routeAddressIndex: number): number[] {
    const savedIndex = walletAddressIndex(wallet, targetAddress)
    const allIndexes = wallet.meta.addresses.map((_address, index) => index)

    return uniqueNumbers([
        routeAddressIndex,
        savedIndex,
        ...allIndexes
    ]).filter(index => index >= 0)
}

function candidatePaths(entity: VaultEntity): string[] {
    return uniqueStrings([
        entity.path || '',
        VET_HD_PATH,
        ETH_HD_PATH,
        LEGACY_VET_ACCOUNT_PATH,
        LEGACY_ETH_ACCOUNT_PATH
    ].filter(path => path.length > 0))
}

function rootMatchesEntity(words: string[], path: string, entity: VaultEntity): boolean {
    if (!entity.chainCode) {
        return false
    }

    try {
        const root = HDNode.fromMnemonic(words, path)
        return root.publicKey.toString('hex') === entity.pub &&
            root.chainCode.toString('hex') === entity.chainCode
    } catch {
        return false
    }
}

function sortedCandidatePaths(words: string[], entity: VaultEntity): string[] {
    const paths = candidatePaths(entity)
    const matchingPaths = paths.filter(path => rootMatchesEntity(words, path, entity))
    const fallbackPaths = paths.filter(path => !matchingPaths.includes(path))

    return [...matchingPaths, ...fallbackPaths]
}

function tryVaultNode(vault: Vault, addressIndex: number, targetAddress: string, umk: Buffer): Buffer | null {
    const privateKey = vault.derive(addressIndex).unlock(umk)
    if (privateKeyMatchesAddress(privateKey, targetAddress)) {
        return privateKey
    }

    privateKey.fill(0)
    return null
}

function tryMnemonicPath(words: string[], path: string, addressIndex: number, targetAddress: string): Buffer | null {
    try {
        const privateKey = HDNode.fromMnemonic(words, path).derive(addressIndex).privateKey
        if (!privateKey) {
            return null
        }

        if (privateKeyMatchesAddress(privateKey, targetAddress)) {
            return privateKey
        }

        privateKey.fill(0)
        return null
    } catch {
        return null
    }
}

function fail(message: string): never {
    throw new Error(message)
}

export function unlockPrivateKeyForBackup(
    wallet: M.Wallet,
    targetAddress: string,
    routeAddressIndex: number,
    umk: Buffer
): Buffer {
    if (wallet.meta.type === 'ledger') {
        throw new Error('ledger wallets do not expose private keys')
    }

    const vault = Vault.decode(wallet.vault)
    const entity = decodeVaultEntity(wallet.vault)

    if (wallet.meta.type === 'private-key') {
        return tryVaultNode(vault, 0, targetAddress, umk) ||
            fail('private key does not match wallet address')
    }

    const indexes = candidateIndexes(wallet, targetAddress, routeAddressIndex)

    for (const index of indexes) {
        try {
            const privateKey = tryVaultNode(vault, index, targetAddress, umk)
            if (privateKey) {
                return privateKey
            }
        } catch { }
    }

    const clearText = vault.decrypt(umk)
    try {
        const words = mnemonicWords(clearText)
        const paths = sortedCandidatePaths(words, entity)

        for (const path of paths) {
            for (const index of indexes) {
                const privateKey = tryMnemonicPath(words, path, index, targetAddress)
                if (privateKey) {
                    return privateKey
                }
            }
        }
    } finally {
        clearText.fill(0)
    }

    throw new Error('private key could not be matched to wallet address')
}
