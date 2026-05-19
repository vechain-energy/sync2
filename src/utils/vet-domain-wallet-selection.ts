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
