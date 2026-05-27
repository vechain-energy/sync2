import { isRecord, parseStoredArray, parseStoredJson, parseStoredRecord } from 'src/utils/json'
import { TokenRegistry } from './token-registry'
import { SmartAccountCache, normalizeSmartAccountCache } from 'src/utils/smart-accounts'

function isStoredNode(value: unknown): value is M.Node {
    if (!isRecord(value) || !isRecord(value.genesis)) {
        return false
    }
    return typeof value.genesis.id === 'string' && typeof value.url === 'string'
}

export function parseStoredNodes(value: string): M.Node[] {
    return parseStoredArray<unknown>(value).filter(isStoredNode)
}

export function parseStoredStringArray(value: string): string[] {
    return parseStoredArray<unknown>(value).filter((item): item is string => typeof item === 'string')
}

export function parseStoredStringMap(value: string): Record<string, string> {
    const record = parseStoredRecord(value)
    return Object.entries(record).reduce((result: Record<string, string>, [key, item]) => {
        if (typeof item === 'string') {
            result[key] = item
        }
        return result
    }, {})
}

export function parseStoredTokenRegistry(value: string): TokenRegistry {
    return TokenRegistry.normalize(parseStoredJson<unknown>(value, null))
}

export function parseStoredSmartAccountCache(value: string): SmartAccountCache {
    return normalizeSmartAccountCache(parseStoredJson<unknown>(value, null))
}
