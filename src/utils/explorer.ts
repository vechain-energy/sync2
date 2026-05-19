import { genesises, urls } from 'src/consts'

export function txExplorerBaseUrl(gid: string): string {
    switch (genesises.which(gid)) {
        case 'main':
            return `${urls.explorerMain}transactions/`
        case 'test':
            return `${urls.explorerTest}transactions/`
        default:
            return ''
    }
}

export function txExplorerUrl(gid: string, txId: string): string {
    const baseUrl = txExplorerBaseUrl(gid)
    return baseUrl ? `${baseUrl}${txId}` : ''
}
