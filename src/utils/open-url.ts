import { openURL as defaultOpen } from 'quasar'

type ElectronRemote = typeof import('@electron/remote')

export function isSafeExternalUrl(url: string): boolean {
    try {
        const parsed = new URL(url)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
        return false
    }
}

export const openURL = (url: string): boolean => {
    if (!isSafeExternalUrl(url)) {
        return false
    }

    if (process.env.MODE === 'electron') {
        const remote = require('@electron/remote') as ElectronRemote
        void remote.shell.openExternal(url)
    } else if (process.env.MODE === 'cordova') {
        cordova.InAppBrowser.open(url, '_system')
    } else {
        defaultOpen(url)
    }
    return true
}
