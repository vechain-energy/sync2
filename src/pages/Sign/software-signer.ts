import { secp256k1 } from 'thor-devkit'
import { Vault } from '../../core/vault'

export type SoftwareWalletType = 'hd' | 'private-key'

export function isSoftwareWalletType(type: M.Wallet.Meta['type']): type is SoftwareWalletType {
    return type === 'hd' || type === 'private-key'
}

export function signHashWithSoftwareWallet(wallet: M.Wallet, signer: string, umk: Buffer, hash: Buffer): Buffer {
    if (!isSoftwareWalletType(wallet.meta.type)) {
        throw new Error(`unsupported wallet type '${wallet.meta.type}'`)
    }

    const index = wallet.meta.addresses.indexOf(signer)
    if (index < 0) {
        throw new Error('signer not found')
    }

    const vault = Vault.decode(wallet.vault)
    const node = vault.derive(index)
    const privateKey = node.unlock(umk)
    try {
        return secp256k1.sign(hash, privateKey)
    } finally {
        privateKey.fill(0)
    }
}
