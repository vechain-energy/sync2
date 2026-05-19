import { SignerGroup } from './models'

export function buildSignerGroups(wallets: M.Wallet[], enforcedSigner?: string, signers?: string[]): SignerGroup[] {
    if (enforcedSigner) {
        const wallet = wallets.find(item => item.meta.addresses.includes(enforcedSigner))
        return [{
            name: wallet ? wallet.meta.name : '',
            addresses: [enforcedSigner]
        }]
    }

    if (!signers) {
        return wallets.map(wallet => {
            return {
                name: wallet.meta.name,
                addresses: wallet.meta.addresses
            }
        })
    }

    const seenSigners = new Set<string>()
    const groups: SignerGroup[] = []
    const groupsByWalletId = new Map<number, SignerGroup>()

    for (const signer of signers) {
        const normalizedSigner = signer.toLowerCase()
        if (seenSigners.has(normalizedSigner)) {
            continue
        }

        const wallet = wallets.find(item => item.meta.addresses.some(addr => addr.toLowerCase() === normalizedSigner))
        if (!wallet) {
            continue
        }

        const address = wallet.meta.addresses.find(addr => addr.toLowerCase() === normalizedSigner)
        if (!address) {
            continue
        }

        let group = groupsByWalletId.get(wallet.id)
        if (!group) {
            group = {
                name: wallet.meta.name,
                addresses: []
            }
            groupsByWalletId.set(wallet.id, group)
            groups.push(group)
        }
        group.addresses.push(address)
        seenSigners.add(normalizedSigner)
    }

    return groups
}

export function selectSigner(groups: SignerGroup[], currentSigner: string, preferredSigner?: string): string {
    const preferred = preferredSigner && groups
        .reduce<string[]>((items, group) => items.concat(group.addresses), [])
        .find(address => address.toLowerCase() === preferredSigner.toLowerCase())
    if (preferred) {
        return preferred
    }

    const current = groups.some(group => {
        return group.addresses.some(address => address.toLowerCase() === currentSigner.toLowerCase())
    })
    if (current) {
        return currentSigner
    }

    return groups[0] && groups[0].addresses[0] ? groups[0].addresses[0] : ''
}
