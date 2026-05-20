import { Storage } from 'core/storage'
import { delegateTable } from './utils'
import { isRecord, parseStoredRecord } from 'src/utils/json'

function stringField(source: Record<string, unknown>, key: string): string {
    const value = source[key]
    return typeof value === 'string' ? value : ''
}

function parseBaseGlob(value: string): M.Activity.Glob {
    const glob = parseStoredRecord(value)
    return {
        id: stringField(glob, 'id'),
        encoded: stringField(glob, 'encoded'),
        signer: stringField(glob, 'signer'),
        origin: stringField(glob, 'origin'),
        link: stringField(glob, 'link')
    }
}

function parseTxGlob(value: string): M.Activity.TxGlob {
    const glob = parseStoredRecord(value)
    return {
        ...parseBaseGlob(value),
        comment: stringField(glob, 'comment'),
        receipt: isRecord(glob.receipt) ? glob.receipt as Connex.Thor.Transaction.Receipt : null
    }
}

export function build(storage: Storage) {
    const t = delegateTable<Storage.ActivityEntity, M.Activity>(
        storage.activities,
        e => {
            const base = {
                id: e.id,
                gid: e.gid,
                walletId: e.walletId,
                createdTime: e.createdTime,
                status: e.status
            }
            if (e.type === 'tx') {
                return {
                    ...base,
                    type: e.type,
                    glob: parseTxGlob(e.glob)
                }
            }
            return {
                ...base,
                type: e.type,
                glob: parseBaseGlob(e.glob)
            }
        },
        m => ({
            id: m.id,
            gid: m.gid,
            type: m.type,
            walletId: m.walletId,
            createdTime: m.createdTime,
            status: m.status,
            glob: m.glob && JSON.stringify(m.glob)
        })
    )
    return {
        uncompleted() {
            return t.all().except({ status: 'completed' }).query()
        },
        page(count: number, offset: number) {
            return t.all().reverse().limit(count, offset).query()
        },
        add(a: M.Activity<'id?'>) {
            return t.insert(a)
        },
        // only tx activity is allowed to be updated
        update(id: number, values: { status?: M.Activity['status'], glob?: M.Activity.TxGlob }) {
            return t.update({ id }, values)
        }
    }
}
