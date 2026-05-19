export type VetDomainWalletOption = {
    label: string
    value: number
}

export type VetDomainAddressOption = {
    label: string
    value: string
    walletId: number
}

function shortAddress(addr: string): string {
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`
}

export function buildVetDomainWalletOptions(wallets: M.Wallet[]): VetDomainWalletOption[] {
    return wallets.map(wallet => {
        return {
            label: `${wallet.meta.name} - ${shortAddress(wallet.meta.addresses[0] || '')}`,
            value: wallet.id
        }
    })
}

export function buildVetDomainAddressOptions(wallet: M.Wallet | null): VetDomainAddressOption[] {
    if (!wallet) {
        return []
    }

    return wallet.meta.addresses.map((addr, index) => {
        return {
            label: `#${index + 1} - ${shortAddress(addr)}`,
            value: addr,
            walletId: wallet.id
        }
    })
}

export function findVetDomainWallet(wallets: M.Wallet[], walletId: number): M.Wallet | null {
    return wallets.find(wallet => wallet.id === walletId) || wallets[0] || null
}

export function resolveVetDomainAddress(wallet: M.Wallet | null, selectedAddress: string): string {
    if (!wallet) {
        return ''
    }
    if (wallet.meta.addresses.includes(selectedAddress)) {
        return selectedAddress
    }
    return wallet.meta.addresses[0] || ''
}
