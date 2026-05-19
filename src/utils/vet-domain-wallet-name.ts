export function firstVetDomainWalletName(names: string[]): string {
    return names.find(name => !!name) || ''
}

export function vetDomainWalletDisplayName(wallet: M.Wallet, names: string[]): string {
    return firstVetDomainWalletName(names) || wallet.meta.name
}
