/* eslint-env mocha */
import * as assert from 'assert'
import { buildLocalGasPayerOptions, isLocalGasPayerMode, LOCAL_ACCOUNT_FEE_MODE } from '../src/pages/Sign/local-gas-payer'

const signer = '0x1111111111111111111111111111111111111111'
const payer = '0x2222222222222222222222222222222222222222'
const duplicatePayer = payer.toUpperCase()
const ledgerPayer = '0x3333333333333333333333333333333333333333'
const privateKeyPayer = '0x4444444444444444444444444444444444444444'

function wallet(id: number, name: string, type: M.Wallet.Meta['type'], addresses: string[]): M.Wallet {
    return {
        id,
        gid: '0x0',
        vault: '',
        meta: {
            name,
            type,
            addresses
        }
    }
}

describe('local gas payer helpers', () => {
    it('keeps only owned software accounts that are not the active signer', () => {
        const options = buildLocalGasPayerOptions([
            wallet(1, 'Main', 'hd', [signer, payer, 'not-address']),
            wallet(2, 'Duplicate', 'hd', [duplicatePayer]),
            wallet(3, 'Ledger', 'ledger', [ledgerPayer]),
            wallet(4, 'Private Key', 'private-key', [privateKeyPayer])
        ], signer.toUpperCase())

        assert.deepStrictEqual(options, [
            {
                walletId: 1,
                walletName: 'Main',
                address: payer
            },
            {
                walletId: 4,
                walletName: 'Private Key',
                address: privateKeyPayer
            }
        ])
        assert.strictEqual(isLocalGasPayerMode(LOCAL_ACCOUNT_FEE_MODE), true)
        assert.strictEqual(isLocalGasPayerMode('standard-vtho'), false)
    })
})
