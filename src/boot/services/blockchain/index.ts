import { abis } from 'src/consts'
import { createPool } from './pool'
import { commitTx } from './tx-commiter'
import { cleanResolvedAddress, cleanResolvedName, isVetDomainName, normalizeVetDomainName } from 'src/utils/vet-domains'
import { decodedString, getVetDomainContracts, vetDomainNamehash } from 'src/utils/vet-domain-registration'
import {
    VET_DOMAIN_PROFILE_TEXT_KEYS,
    VetDomainProfile,
    convertVetDomainProfileUriToUrl,
    emptyVetDomainProfile,
    getVetDomainRegistry,
    vetDomainResolverABI,
    vetDomainTextABI
} from 'src/utils/vet-domain-profile'
import { reactive } from 'vue'
import {
    SMART_ACCOUNT_SCAN_CHUNK,
    SMART_ACCOUNT_SCAN_PAGE_SIZE,
    SmartAccount,
    SmartAccountCache,
    accountCreatedEventABI,
    decodeAccountCreatedEvent,
    mergeSmartAccounts,
    smartAccountCacheKey,
    smartAccountFactoryABIs,
    smartAccountFactoryByGid
} from 'src/utils/smart-accounts'

const VetDomainsResolverByGid: Record<string, string> = {
    // MainNet Resolver Utility
    '0x00000000851caf3cfdb6e899cf5958bfb1ac3413d346d43539627e6be7ec1b4a': '0xA11413086e163e41901bb81fdc5617c975Fa5a1A',

    // TestNet Resolver Utility
    '0x000000000b2bce3c70bc649a02749e8687721b09ed2e15997f466536b20bb127': '0xc403b8EA53F707d7d4de095f0A20bC491Cf2bc94'
}

const vetDomainsGetAddressesABI = {
    inputs: [
        {
            internalType: 'string[]',
            name: 'names',
            type: 'string[]'
        }
    ],
    name: 'getAddresses',
    outputs: [
        {
            internalType: 'address[]',
            name: 'addresses',
            type: 'address[]'
        }
    ],
    stateMutability: 'view',
    type: 'function'
}

const vetDomainsGetNamesABI = {
    inputs: [
        {
            internalType: 'address[]',
            name: 'addresses',
            type: 'address[]'
        }
    ],
    name: 'getNames',
    outputs: [
        {
            internalType: 'string[]',
            name: 'names',
            type: 'string[]'
        }
    ],
    stateMutability: 'view',
    type: 'function'
}

type SmartAccountCacheStore = {
    getSmartAccountCache(key: string): Promise<SmartAccountCache>
    saveSmartAccountCache(key: string, val: SmartAccountCache): Promise<void>
}

function decodedAddress(output: Connex.VM.Output & Connex.Thor.Account.WithDecoded, key: string): string {
    const value = output.decoded[key] || output.decoded[0]
    return typeof value === 'string' ? value.toLowerCase() : ''
}

function decodedNumber(output: Connex.VM.Output & Connex.Thor.Account.WithDecoded, key: string): number {
    const value = output.decoded[key] || output.decoded[0]
    const parsed = typeof value === 'string' || typeof value === 'number' ? Number(value) : 0
    return Number.isFinite(parsed) ? parsed : 0
}

function decodedBoolean(output: Connex.VM.Output & Connex.Thor.Account.WithDecoded, key: string): boolean {
    return output.decoded[key] === true || output.decoded[1] === true
}

function serve(gid: string, pool: ReturnType<typeof createPool>, cacheStore: SmartAccountCacheStore) {
    const namesByAddress = new Map<string, string>()
    const addressesByName = new Map<string, string>()
    const resolverByName = new Map<string, string>()
    const profileByName = new Map<string, VetDomainProfile>()
    const vetDomainsReactor = reactive({ v: 0 })

    function touchVetDomains() {
        vetDomainsReactor.v++
    }

    return {
        get thor() { return pool.get(gid).thor },
        balanceOf(addr: string, spec: M.TokenSpec) {
            if (spec.symbol === 'VET') {
                return this.thor.account(addr).get().then(a => a.balance)
            } else if (spec.symbol === 'VTHO') {
                return this.thor.account(addr).get().then(a => a.energy)
            } else {
                return this.thor.account(spec.address)
                    .method(abis.balanceOf)
                    .cache([addr])
                    .call(addr)
                    .then(output => output.decoded.balance)
            }
        },
        commitTx(raw: string) {
            commitTx(pool.resoleNode(gid).url, raw)
        },
        supportsVetDomains() {
            return !!VetDomainsResolverByGid[gid]
        },
        vetDomainsRevision() {
            return vetDomainsReactor.v
        },
        setVetDomainProfile(name: string, profile: VetDomainProfile) {
            const resolvedName = cleanResolvedName(name)
            if (!resolvedName) {
                return
            }
            profileByName.set(resolvedName, profile)
            touchVetDomains()
        },
        setVetDomainsPrimaryName(addr: string, name: string) {
            const resolvedAddress = cleanResolvedAddress(addr)
            const resolvedName = cleanResolvedName(name)
            if (!resolvedAddress || !resolvedName) {
                return
            }

            namesByAddress.set(resolvedAddress.toLowerCase(), resolvedName)
            addressesByName.set(resolvedName, resolvedAddress)
            touchVetDomains()
        },
        async smartAccountsOf(wallet: M.Wallet): Promise<SmartAccount[]> {
            if (!smartAccountFactoryByGid[gid]) {
                return []
            }
            const accounts = await Promise.all(wallet.meta.addresses.map(owner => this.refreshSmartAccounts(wallet, owner)))
            return mergeSmartAccounts(accounts.flat()).filter(account => account.deployed)
        },
        async refreshSmartAccounts(wallet: M.Wallet, owner: string): Promise<SmartAccount[]> {
            const factory = smartAccountFactoryByGid[gid]
            if (!factory) {
                return []
            }

            const ownerAddress = owner.toLowerCase()
            const cacheKey = smartAccountCacheKey(gid, ownerAddress, factory)
            const cached = await cacheStore.getSmartAccountCache(cacheKey)
            const discovered: SmartAccount[] = [...cached.accounts]

            try {
                const accountOutput = await this.thor.account(factory)
                    .method(smartAccountFactoryABIs.getAccountAddress)
                    .call(ownerAddress)
                const accountAddress = decodedAddress(accountOutput, 'account')
                if (accountAddress) {
                    const versionOutput = await this.thor.account(factory)
                        .method(smartAccountFactoryABIs.getAccountVersion)
                        .call(accountAddress, ownerAddress)
                    discovered.push({
                        address: accountAddress,
                        owner: ownerAddress,
                        walletId: wallet.id,
                        gid,
                        version: decodedNumber(versionOutput, 'accountVersion'),
                        salt: '0',
                        source: 'default',
                        deployed: decodedBoolean(versionOutput, 'isDeployed')
                    })
                }
            } catch (err) {
                console.warn('smart account default lookup:', err)
            }

            const headNumber = this.thor.status.head.number
            let scannedTo = cached.scannedTo
            for (let from = Math.max(scannedTo + 1, 0); from <= headNumber; from += SMART_ACCOUNT_SCAN_CHUNK) {
                const to = Math.min(from + SMART_ACCOUNT_SCAN_CHUNK - 1, headNumber)
                let offset = 0
                for (; ;) {
                    const events = await this.thor.account(factory)
                        .event(accountCreatedEventABI)
                        .filter([{}])
                        .range({ unit: 'block', from, to })
                        .order('asc')
                        .apply(offset, SMART_ACCOUNT_SCAN_PAGE_SIZE)
                    for (const event of events) {
                        const decoded = decodeAccountCreatedEvent(event)
                        if (decoded && decoded.owner.toLowerCase() === ownerAddress) {
                            const state = await this.thor.account(decoded.account).get()
                            discovered.push({
                                address: decoded.account,
                                owner: ownerAddress,
                                walletId: wallet.id,
                                gid,
                                version: 0,
                                salt: decoded.salt,
                                source: 'event',
                                deployed: state.hasCode
                            })
                        }
                    }
                    if (events.length < SMART_ACCOUNT_SCAN_PAGE_SIZE) {
                        break
                    }
                    offset += events.length
                }
                scannedTo = to
            }

            const nextCache = {
                accounts: mergeSmartAccounts(discovered),
                scannedTo
            }
            await cacheStore.saveSmartAccountCache(cacheKey, nextCache)
            return nextCache.accounts.filter(account => account.deployed)
        },
        async vetDomainsAddressesOf(names: string[]): Promise<string[]> {
            const resolver = VetDomainsResolverByGid[gid]
            const normalizedNames = names.map(normalizeVetDomainName)
            if (!resolver) {
                return normalizedNames.map(() => '')
            }

            const missingNames = normalizedNames.filter(name => {
                return isVetDomainName(name) && !addressesByName.has(name)
            })
            if (missingNames.length > 0) {
                const output = await this.thor
                    .account(resolver)
                    .method(vetDomainsGetAddressesABI)
                    .cache([])
                    .call(missingNames)

                const addresses = output.decoded.addresses as string[]
                missingNames.forEach((name, index) => {
                    const resolved = cleanResolvedAddress(addresses[index] || '')
                    addressesByName.set(name, resolved)
                    if (resolved) {
                        namesByAddress.set(resolved.toLowerCase(), name)
                    }
                })
            }

            return normalizedNames.map(name => {
                return isVetDomainName(name) ? addressesByName.get(name) || '' : ''
            })
        },
        async vetDomainResolverOf(name: string): Promise<string> {
            const normalizedName = cleanResolvedName(name)
            const contracts = getVetDomainContracts(gid)
            if (!normalizedName || !contracts) {
                return ''
            }

            if (!resolverByName.has(normalizedName)) {
                try {
                    const output = await this.thor
                        .account(getVetDomainRegistry(contracts))
                        .method(vetDomainResolverABI)
                        .cache([])
                        .call(vetDomainNamehash(normalizedName))
                    resolverByName.set(normalizedName, cleanResolvedAddress(decodedString(output.decoded, 'resolverAddress')))
                } catch (err) {
                    console.warn('vet domain resolver:', err)
                    resolverByName.set(normalizedName, '')
                }
            }
            return resolverByName.get(normalizedName) || ''
        },
        async vetDomainProfileOf(name: string): Promise<VetDomainProfile> {
            const normalizedName = cleanResolvedName(name)
            if (!normalizedName || !getVetDomainContracts(gid)) {
                return emptyVetDomainProfile()
            }

            if (!profileByName.has(normalizedName)) {
                const resolver = await this.vetDomainResolverOf(normalizedName)
                if (!resolver) {
                    profileByName.set(normalizedName, emptyVetDomainProfile())
                } else {
                    const node = vetDomainNamehash(normalizedName)
                    const profile = emptyVetDomainProfile()
                    await Promise.all(VET_DOMAIN_PROFILE_TEXT_KEYS.map(async key => {
                        try {
                            const output = await this.thor
                                .account(resolver)
                                .method(vetDomainTextABI)
                                .cache([])
                                .call(node, key)
                            profile[key] = decodedString(output.decoded, '')
                        } catch (err) {
                            console.warn(`vet domain text ${key}:`, err)
                            profile[key] = ''
                        }
                    }))
                    profileByName.set(normalizedName, profile)
                }
            }
            return profileByName.get(normalizedName) || emptyVetDomainProfile()
        },
        async vetDomainAvatarOfAddress(addr: string): Promise<string> {
            const resolvedAddress = cleanResolvedAddress(addr)
            if (!resolvedAddress || !getVetDomainContracts(gid)) {
                return ''
            }

            const [name] = await this.vetDomainsNamesOf([resolvedAddress])
            if (!name) {
                return ''
            }
            try {
                const profile = await this.vetDomainProfileOf(name)
                return convertVetDomainProfileUriToUrl(profile.avatar, gid)
            } catch (err) {
                console.warn('vet domain avatar:', err)
                return ''
            }
        },
        async vetDomainsNamesOf(addresses: string[]): Promise<string[]> {
            const resolver = VetDomainsResolverByGid[gid]
            const normalizedAddresses = addresses.map(item => cleanResolvedAddress(item).toLowerCase())
            if (!resolver) {
                return normalizedAddresses.map(() => '')
            }

            const missingAddresses = normalizedAddresses.filter(addr => {
                return !!addr && !namesByAddress.has(addr)
            })
            if (missingAddresses.length > 0) {
                const output = await this.thor
                    .account(resolver)
                    .method(vetDomainsGetNamesABI)
                    .cache([])
                    .call(missingAddresses)

                const names = output.decoded.names as string[]
                missingAddresses.forEach((addr, index) => {
                    const resolved = cleanResolvedName(names[index] || '')
                    namesByAddress.set(addr, resolved)
                    if (resolved) {
                        addressesByName.set(resolved, cleanResolvedAddress(addr))
                    }
                })
            }

            return normalizedAddresses.map(addr => {
                return addr ? namesByAddress.get(addr) || '' : ''
            })
        }
    }
}

export function build(resolveNode: (gid: string) => M.Node, cacheStore: SmartAccountCacheStore) {
    const pool = createPool(resolveNode)
    const cache = new Map<string, ReturnType<typeof serve>>()
    return (gid: string) => {
        let handler = cache.get(gid)
        if (!handler) {
            cache.set(gid, handler = serve(gid, pool, cacheStore))
        }
        return handler
    }
}
