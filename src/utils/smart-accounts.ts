import { abi, address } from 'thor-devkit'
import { genesises } from 'src/consts'
import { isRecord } from './json'

export type SmartAccount = {
    address: string
    owner: string
    walletId: number
    gid: string
    version: number
    salt: string
    source: 'default' | 'event'
    deployed: boolean
}

export type SmartAccountCache = {
    accounts: SmartAccount[]
    scannedTo: number
}

export const SMART_ACCOUNT_SCAN_CHUNK = 500000
export const SMART_ACCOUNT_SCAN_PAGE_SIZE = 256

export const smartAccountFactoryByGid: Record<string, string> = {
    [genesises.main.id]: '0xC06Ad8573022e2BE416CA89DA47E8c592971679A',
    [genesises.test.id]: '0x713b908Bcf77f3E00EFEf328E50b657a1A23AeaF'
}

export const smartAccountFactoryABIs = {
    getAccountAddress: {
        inputs: [{ name: 'owner', type: 'address' }],
        name: 'getAccountAddress',
        outputs: [{ name: 'account', type: 'address' }],
        stateMutability: 'view',
        type: 'function'
    } as abi.Function.Definition,
    getAccountVersion: {
        inputs: [
            { name: 'account', type: 'address' },
            { name: 'owner', type: 'address' }
        ],
        name: 'getAccountVersion',
        outputs: [
            { name: 'accountVersion', type: 'uint256' },
            { name: 'isDeployed', type: 'bool' }
        ],
        stateMutability: 'view',
        type: 'function'
    } as abi.Function.Definition,
    execute: {
        inputs: [
            { name: 'dest', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'func', type: 'bytes' }
        ],
        name: 'execute',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    } as abi.Function.Definition,
    executeBatch: {
        inputs: [
            { name: 'dest', type: 'address[]' },
            { name: 'value', type: 'uint256[]' },
            { name: 'func', type: 'bytes[]' }
        ],
        name: 'executeBatch',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    } as abi.Function.Definition
}

export const accountCreatedEventABI: abi.Event.Definition = {
    anonymous: false,
    inputs: [
        { indexed: false, name: 'account', type: 'address' },
        { indexed: false, name: 'owner', type: 'address' },
        { indexed: false, name: 'salt', type: 'uint256' }
    ],
    name: 'AccountCreated',
    type: 'event'
}

const zeroBytes = '0x'

function normalizedAddress(value: unknown): string {
    return typeof value === 'string' && address.test(value) ? value.toLowerCase() : ''
}

function normalizedVersion(value: unknown): number {
    const version = typeof value === 'string' || typeof value === 'number' ? Number(value) : 0
    return Number.isFinite(version) && version >= 0 ? version : 0
}

export function normalizeSmartAccount(value: unknown): SmartAccount | null {
    if (!isRecord(value)) {
        return null
    }

    const smartAccountAddress = normalizedAddress(value.address)
    const owner = normalizedAddress(value.owner)
    const gid = typeof value.gid === 'string' ? value.gid : ''
    const walletId = typeof value.walletId === 'number' && Number.isSafeInteger(value.walletId) ? value.walletId : 0
    const source = value.source === 'event' ? 'event' : 'default'
    if (!smartAccountAddress || !owner || !gid || walletId <= 0) {
        return null
    }

    return {
        address: smartAccountAddress,
        owner,
        walletId,
        gid,
        version: normalizedVersion(value.version),
        salt: typeof value.salt === 'string' ? value.salt : '0',
        source,
        deployed: value.deployed === true
    }
}

export function normalizeSmartAccountCache(value: unknown): SmartAccountCache {
    if (!isRecord(value)) {
        return { accounts: [], scannedTo: -1 }
    }

    const accounts = Array.isArray(value.accounts)
        ? value.accounts.map(normalizeSmartAccount).filter((item): item is SmartAccount => !!item)
        : []
    const scannedTo = typeof value.scannedTo === 'number' && Number.isFinite(value.scannedTo) ? value.scannedTo : -1

    return {
        accounts: mergeSmartAccounts(accounts),
        scannedTo
    }
}

export function mergeSmartAccounts(accounts: SmartAccount[]): SmartAccount[] {
    const byAddress = new Map<string, SmartAccount>()
    for (const account of accounts) {
        const key = account.address.toLowerCase()
        const existing = byAddress.get(key)
        byAddress.set(key, existing
            ? {
                ...existing,
                ...account,
                source: existing.source === 'default' ? 'default' : account.source,
                deployed: existing.deployed || account.deployed
            }
            : account)
    }
    return Array.from(byAddress.values()).sort((a, b) => a.address.localeCompare(b.address))
}

export function smartAccountCacheKey(gid: string, owner: string, factory: string): string {
    return `${gid}:${owner.toLowerCase()}:${factory.toLowerCase()}`
}

export function decodeAccountCreatedEvent(event: Connex.VM.Event): { account: string; owner: string; salt: string } | null {
    try {
        const decoded = new abi.Event(accountCreatedEventABI).decode(event.data || zeroBytes, event.topics || [])
        const account = normalizedAddress(decoded.account || decoded[0])
        const owner = normalizedAddress(decoded.owner || decoded[1])
        if (!account || !owner) {
            return null
        }
        return {
            account,
            owner,
            salt: String(decoded.salt || decoded[2] || '0')
        }
    } catch {
        return null
    }
}

export function buildSmartAccountClauses(smartAccount: SmartAccount, originalClauses: Connex.Vendor.TxMessage): Connex.Vendor.TxMessage {
    if (originalClauses.length === 0) {
        return []
    }

    const clauses = originalClauses.map(clause => {
        if (!clause.to) {
            throw new Error('you need to use the owner account for contract deployment clauses')
        }
        return {
            to: clause.to,
            value: clause.value || 0,
            data: clause.data || zeroBytes
        }
    })

    if (clauses.length === 1) {
        const func = new abi.Function(smartAccountFactoryABIs.execute)
        const clause = clauses[0]
        return [{
            to: smartAccount.address,
            value: 0,
            data: func.encode(clause.to, clause.value, clause.data),
            comment: originalClauses[0].comment
        }]
    }

    const func = new abi.Function(smartAccountFactoryABIs.executeBatch)
    return [{
        to: smartAccount.address,
        value: 0,
        data: func.encode(
            clauses.map(clause => clause.to),
            clauses.map(clause => clause.value),
            clauses.map(clause => clause.data)
        ),
        comment: originalClauses.find(clause => !!clause.comment)?.comment
    }]
}
