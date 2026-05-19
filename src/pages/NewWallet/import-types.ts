export type ImportTab = 'mnemonic' | 'private-key'

export type ImportState = {
    tab: ImportTab
    words: string
    path: string
    privateKey: string
}

export type ImportResult = {
    type: 'mnemonic'
    words: string[]
    path: string
} | {
    type: 'private-key'
    privateKey: Buffer
}
