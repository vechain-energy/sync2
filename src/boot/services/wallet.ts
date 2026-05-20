import { Storage } from 'core/storage'
import { delegateTable } from './utils'
import { parseStoredRecord } from 'src/utils/json'

function stringField(source: Record<string, unknown>, key: string, fallback: string): string {
    const value = source[key]
    return typeof value === 'string' ? value : fallback
}

function walletTypeField(value: unknown): M.Wallet.Meta['type'] {
    return value === 'ledger' || value === 'private-key' ? value : 'hd'
}

function stringArrayField(source: Record<string, unknown>, key: string): string[] {
    const value = source[key]
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function parseWalletMeta(value: string, id: number): M.Wallet.Meta {
    const meta = parseStoredRecord(value)
    return {
        name: stringField(meta, 'name', `Wallet ${id}`),
        type: walletTypeField(meta.type),
        addresses: stringArrayField(meta, 'addresses'),
        backedUp: meta.backedUp === true
    }
}

export function build(storage: Storage) {
    const t = delegateTable<Storage.WalletEntity, M.Wallet>(
        storage.wallets,
        e => {
            const meta = parseWalletMeta(e.meta, e.id)
            return {
                id: e.id,
                gid: e.gid,
                vault: e.vault,
                meta
            }
        },
        m => ({
            id: m.id,
            gid: m.gid,
            vault: m.vault,
            meta: m.meta && JSON.stringify(m.meta)
        }))

    return {
        all() { return t.all().query() },
        get(id: number) {
            return t.all()
                .where({ id })
                .query()
                .then(r => r.length > 0 ? r[0] : null)
        },
        getByGid(gid: string) {
            return t.all()
                .where({ gid })
                .query()
        },
        insert(w: Omit<M.Wallet, 'id'>) {
            return t.insert(w)
        },
        update(id: number, meta: M.Wallet.Meta) {
            return t.update({ id }, { meta })
        },
        delete(id: number) {
            return t.delete({ id })
        }
    }
}
