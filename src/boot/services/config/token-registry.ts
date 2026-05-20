import axios from 'axios'
import { isRecord, parseStoredArray } from 'src/utils/json'

export type TokenRegistry = {
    updated: number
    main: TokenRegistry.Entity[]
    test: TokenRegistry.Entity[]
}

export namespace TokenRegistry {
    const url = 'https://vechain.github.io/token-registry/'

    export type Entity = {
        name: string
        symbol: string
        decimals: number
        address: string
        icon: string
        iconSrc?: string
    }

    export const permanents: Entity[] = [
        {
            name: 'VeChain',
            symbol: 'VET',
            address: '',
            decimals: 18,
            icon: '',
            get iconSrc() { return require('assets/vet.svg') as string }
        },
        {
            symbol: 'VTHO',
            name: 'VeChain Thor',
            address: '0x0000000000000000000000000000456e65726779',
            decimals: 18,
            icon: '',
            get iconSrc() { return require('assets/vtho.svg') as string }
        }
    ]

    function isEntity(value: unknown): value is Entity {
        if (!isRecord(value)) {
            return false
        }
        return typeof value.name === 'string' &&
            typeof value.symbol === 'string' &&
            typeof value.address === 'string' &&
            typeof value.icon === 'string' &&
            Number.isFinite(value.decimals) &&
            (value.iconSrc === undefined || typeof value.iconSrc === 'string')
    }

    export function normalize(value: unknown): TokenRegistry {
        if (!isRecord(value)) {
            return { updated: 0, main: [], test: [] }
        }

        return {
            updated: Number.isFinite(value.updated) ? value.updated as number : 0,
            main: Array.isArray(value.main) ? value.main.filter(isEntity) : [],
            test: Array.isArray(value.test) ? value.test.filter(isEntity) : []
        }
    }

    export async function fetch(): Promise<TokenRegistry> {
        const nets = ['main', 'test']
        const result = await Promise.all(nets.map(async net => {
            const resp = await axios.get(`${url}${net}.json`, { transformResponse: data => data, timeout: 30 * 1000 })
            return parseStoredArray<unknown>(resp.data)
                .filter(isEntity)
                .filter(t => t.symbol !== 'VTHO')
        }))
        return {
            updated: Date.now(),
            main: result[0],
            test: result[1]
        }
    }

    export function iconSrc(icon: string) {
        return `${url}assets/${icon}`
    }
}
