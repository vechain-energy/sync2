import { SignerGroup } from './models'

export function buildSignerGroups(wallets: M.Wallet[], enforcedSigner?: string, signers?: string[]): SignerGroup[] {
    if (enforcedSigner) {
        const wallet = wallets.find(item => item.meta.addresses.includes(enforcedSigner))
        return [{
            name: wallet ? wallet.meta.name : '',
            addresses: [enforcedSigner]
        }]
    }

    const allowedSigners = signers ? signers.map(item => item.toLowerCase()) : null
    return wallets
        .map(wallet => {
            const addresses = allowedSigners
                ? allowedSigners
                    .map(signer => wallet.meta.addresses.find(addr => addr.toLowerCase() === signer) || '')
                    .filter(addr => !!addr)
                : wallet.meta.addresses
            return {
                name: wallet.meta.name,
                addresses
            }
        })
        .filter(group => group.addresses.length > 0)
}
