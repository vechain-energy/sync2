import { genesises } from '../../../consts'

export const presetNodes: M.Node[] = [
    { // mainnet
        genesis: genesises.main,
        preset: true,
        url: 'https://mainnet.vechain.org'
    },
    { // testnet
        genesis: genesises.test,
        preset: true,
        url: 'https://testnet.vechain.org'
    }
]
