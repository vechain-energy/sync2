import { wrap } from './sqlite'
import { deviceReady } from 'src/utils/cordova'

export async function open() {
    await deviceReady

    const name = process.env.PROD ? 'data-store.db' : 'data-store-dev.db'
    const db = window.sqlitePlugin.openDatabase({
        name,
        location: 'default',
        androidDatabaseProvider: 'system'
    })
    window.addEventListener('unload', () => { db.close() })

    return wrap({
        query: (sql, ...params) => {
            return new Promise((resolve, reject) => {
                db.executeSql(
                    sql,
                    params,
                    (res: SQLiteResultSet) => {
                        const rows = []
                        for (let i = 0; i < res.rows.length; i++) {
                            rows.push(res.rows.item(i))
                        }
                        resolve(rows)
                    },
                    (err: { message: string }) => reject(new Error(err.message))) // err is not an Error object
            })
        },
        exec: (sql, ...params) => {
            return new Promise((resolve, reject) => {
                db.executeSql(
                    sql,
                    params,
                    (r: SQLiteResultSet) => resolve({ insertId: r.insertId }),
                    (err: { message: string }) => reject(new Error(err.message)))
            })
        }
    })
}
