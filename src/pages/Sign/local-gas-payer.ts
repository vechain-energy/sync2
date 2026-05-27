import { address } from 'thor-devkit'
import { GenericFeeMode } from './generic-delegator'
import { isSoftwareWalletType } from './software-signer'

export const LOCAL_ACCOUNT_FEE_MODE = 'local-account'

export type LocalGasPayerMode = typeof LOCAL_ACCOUNT_FEE_MODE
export type FeeMode = GenericFeeMode | LocalGasPayerMode

export type LocalGasPayerOption = {
    walletId: number
    walletName: string
    address: string
}

export function isLocalGasPayerMode(mode: FeeMode): mode is LocalGasPayerMode {
    return mode === LOCAL_ACCOUNT_FEE_MODE
}

export function buildLocalGasPayerOptions(wallets: M.Wallet[], signer: string): LocalGasPayerOption[] {
    const normalizedSigner = signer.toLowerCase()
    const seen = new Set<string>()
    const options: LocalGasPayerOption[] = []

    for (const wallet of wallets) {
        if (!isSoftwareWalletType(wallet.meta.type)) {
            continue
        }

        for (const item of wallet.meta.addresses) {
            if (!address.test(item)) {
                continue
            }

            const normalizedAddress = item.toLowerCase()
            if (normalizedAddress === normalizedSigner || seen.has(normalizedAddress)) {
                continue
            }

            seen.add(normalizedAddress)
            options.push({
                walletId: wallet.id,
                walletName: wallet.meta.name,
                address: item
            })
        }
    }

    return options
}
