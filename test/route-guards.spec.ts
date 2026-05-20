/* eslint-env mocha */
import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import { parseRouteInteger } from 'src/utils/route'

function sourceFile(file: string) {
    return fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
}

describe('route guards', () => {
    it('parses route integers without accepting partial values', () => {
        assert.strictEqual(parseRouteInteger('0'), 0)
        assert.strictEqual(parseRouteInteger('42'), 42)
        assert.strictEqual(parseRouteInteger(undefined), null)
        assert.strictEqual(parseRouteInteger(''), null)
        assert.strictEqual(parseRouteInteger('-1'), null)
        assert.strictEqual(parseRouteInteger('1abc'), null)
        assert.strictEqual(parseRouteInteger('1.2'), null)
    })

    it('shows recovery states for stale address and asset routes', () => {
        const address = sourceFile('src/pages/Address/Controller.vue')
        const asset = sourceFile('src/pages/Asset/Controller.vue')

        assert.ok(address.includes('v-if="canShowAddress"'))
        assert.ok(address.includes('invalidContextMessage'))
        assert.ok(address.includes('address.msg_wallet_not_found'))
        assert.ok(address.includes('address.msg_address_not_found'))
        assert.ok(asset.includes('v-if="canShowAsset"'))
        assert.ok(asset.includes('invalidContextMessage'))
        assert.ok(asset.includes('address.msg_wallet_not_found'))
        assert.ok(asset.includes('address.msg_address_not_found'))
        assert.ok(asset.includes('asset.msg_asset_not_found'))
    })

    it('shows a recovery state for stale backup routes', () => {
        const backup = sourceFile('src/pages/Backup/Controller.vue')

        assert.ok(backup.includes("import { parseRouteInteger } from 'src/utils/route'"))
        assert.ok(backup.includes('v-if="canStartBackup"'))
        assert.ok(backup.includes('invalidContextMessage'))
        assert.ok(backup.includes('backup.msg_wallet_not_found'))
        assert.ok(backup.includes('backup.msg_mnemonic_backup_only'))
        assert.strictEqual(backup.includes('parseInt(this.walletId, 10)'), false)
    })
})
