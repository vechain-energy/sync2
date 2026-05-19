import { openURL as defaultOpen } from 'quasar'

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

    if (process.env.MODE === 'cordova') {
        cordova.InAppBrowser.open(url, '_system')
    } else {
        defaultOpen(url)
    }
    return true
}
