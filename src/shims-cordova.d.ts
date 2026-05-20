declare interface Window {
    readonly sqlitePlugin: SQLitePlugin
    readonly IonicDeeplink: {
        onDeepLink(cb: (a: {
            url: string
        }) => void)
    }
    readonly Fingerprint: Fingerprint
    readonly Keyboard: unknown
    readonly StatusBar: {
        backgroundColorByName(name: string): void
        styleDefault(): void
    }
}

declare interface SQLitePlugin {
    openDatabase(options: {
        name: string
        location: string
        androidDatabaseProvider: string
    }): SQLiteDatabase
}

declare interface SQLiteDatabase {
    executeSql(
        sql: string,
        params: unknown[],
        success: (result: SQLiteResultSet) => void,
        error: (err: { message: string }) => void
    ): void
    close(): void
}

declare interface SQLiteResultSet {
    readonly insertId: number
    readonly rows: {
        readonly length: number
        item(index: number): Record<string, unknown>
    }
}

declare interface CordovaPlugins {
    clipboard
}

declare interface Cordova {
    InAppBrowser: InAppBrowser;
}
