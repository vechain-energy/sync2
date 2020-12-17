import { Storage } from 'core/storage'
import { delegateTable } from '../utils'
import { genesises } from 'src/consts'
import { TokenRegistry } from './token-registry'
import { unique } from 'src/utils/array'

const presetNodes: M.Node[] = [
    { // mainnet
        genesis: genesises.main,
        preset: true,
        url: 'https://mainnet.veblocks.net'
    },
    { // testnet
        genesis: genesises.test,
        preset: true,
        url: 'https://testnet.veblocks.net'
    }
]

export function build(storage: Storage) {
    const t = delegateTable<Storage.ConfigEntity, Storage.ConfigEntity>(
        storage.configs,
        e => e,
        m => m
    )
    type Key = 'nodes' | 'activeNodeMap' | 'passwordShadow' |
        'tokenRegistry' | 'activeTokenSymbols' | 'recentRecipients' |
        'selectedWalletId'

    const get = async (key: Key) => {
        const row = (await t.all().where({ key, subKey: '' }).query())[0]
        return row ? row.value : ''
    }

    const set = (key: Key, value: string) => {
        return t.insert({ key, subKey: '', value }, true).then(() => { })
    }

    const node = {
        async all(): Promise<M.Node[]> {
            // prepend preset nodes
            return [
                ...JSON.parse(JSON.stringify(presetNodes)),
                ...JSON.parse(await get('nodes') || '[]')
            ]
        },
        save(val: M.Node[]) {
            // exclude preset nodes
            return set('nodes', JSON.stringify(val.filter(n => !n.preset)))
        },
        async activeMap() {
            return JSON.parse(await get('activeNodeMap') || '{}') as Record<string, string>
        },
        saveActiveMap(val: Record<string, string>) {
            return set('activeNodeMap', JSON.stringify(val))
        }
    }

    const token = {
        async all(): Promise<M.TokenSpec[]> {
            const [json, nodes] = await Promise.all([get('tokenRegistry'), node.all()])
            const registry: TokenRegistry = json ? JSON.parse(json) : {
                updated: 0,
                main: [],
                test: []
            }
            if (registry.updated + 6 * 60 * 60 * 1000 < Date.now()) {
                // fetch in background and don't block
                TokenRegistry.fetch()
                    .then(r => set('tokenRegistry', JSON.stringify(r)))
                    .catch(err => console.warn(err))
            }

            const toModel = (gid: string, entity: TokenRegistry.Entity, permanent: boolean): M.TokenSpec => {
                return {
                    gid,
                    name: entity.name,
                    symbol: entity.symbol,
                    decimals: entity.decimals,
                    address: entity.address,
                    iconSrc: entity.iconSrc || TokenRegistry.iconSrc(entity.icon),
                    permanent
                }
            }

            const gids = unique(nodes.map(n => n.genesis.id))
            return ([] as M.TokenSpec[]).concat(
                ...gids.map(gid => TokenRegistry.permanents.map(e => toModel(gid, e, true))),
                registry.main.map(e => toModel(genesises.main.id, e, false)),
                registry.test.map(e => toModel(genesises.test.id, e, false))
            )
        },
        async activeSymbols() {
            return JSON.parse((await get('activeTokenSymbols')) || '[]') as string[]
        },
        saveActiveSymbols(val: string[]) {
            val = Array.from(new Set(val))
            return set('activeTokenSymbols', JSON.stringify(val))
        }
    }
    return {
        get node() { return node },
        get token() { return token },
        getPasswordShadow() {
            return get('passwordShadow')
        },
        savePasswordShadow(val: string) {
            return set('passwordShadow', val)
        },
        getRecentRecipients() {
            return get('recentRecipients').then(r => JSON.parse(r || '[]') as string[])
        },
        saveRecentRecipients(val: string[]) {
            return set('recentRecipients', JSON.stringify(val))
        },
        getSelectedWalletId() {
            return get('selectedWalletId').then(r => parseInt(r))
        },
        saveSelectedWalletId(id: number) {
            return set('selectedWalletId', id.toString())
        }
    }
}
