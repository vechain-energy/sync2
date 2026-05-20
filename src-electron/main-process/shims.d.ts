import type { newUpdater } from './updater'

declare global {
    var __statics: string

    namespace Electron {
        interface App {
            listenOpenUrl: (webContentId: number) => Promise<string>
            updater: ReturnType<typeof newUpdater>
        }
    }

    interface NodeRequireFunction {
        (moduleName: '@electron/remote'): typeof Electron.remote;
    }
}

export {}
