/* eslint-env mocha */
import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'

function sourceFile(file: string) {
    return fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
}

describe('UI regression guards', () => {
    it('renders exported private keys through the Vue 3 model prop', () => {
        const source = sourceFile('src/pages/Address/PrivateKeyDialog.vue')

        assert.ok(source.includes(':model-value="privateKey"'))
        assert.strictEqual(source.includes(':value="privateKey"'), false)
    })

    it('extracts QR code content from Vue 3 slot children', () => {
        const source = sourceFile('src/components/QRCode.vue')

        assert.ok(source.includes('this.$slots.default ? this.$slots.default() : []'))
        assert.ok(source.includes('vnodeText'))
        assert.strictEqual(source.includes('this.$slots.default![0]'), false)
    })

    it('shows resolved address names on receive QR dialogs without changing QR content', () => {
        const headItem = sourceFile('src/pages/Address/HeadItem.vue')
        const dialog = sourceFile('src/pages/QRCodeDialog.vue')
        const models = sourceFile('src/models.d.ts')

        assert.ok(headItem.includes('primaryName: String'))
        assert.ok(headItem.includes('caption: this.primaryName'))
        assert.ok(dialog.includes('req.caption'))
        assert.ok(models.includes('caption?: string'))
    })

    it('keeps generic fee controls from overlapping fee token information', () => {
        const source = sourceFile('src/pages/Sign/GasFeeBar.vue')

        assert.ok(source.includes('flex-wrap: wrap'))
        assert.ok(source.includes('@media (max-width: 420px)'))
        assert.ok(source.includes('padding-left: 92px'))
    })

    it('parses transaction block references as hex for activity expiration checks', () => {
        const source = sourceFile('src/pages/ActivityStatusUpdater/Entry.ts')

        assert.ok(source.includes('Number.parseInt(tx.body.blockRef.slice(2, 10), 16)'))
        assert.strictEqual(source.includes('parseInt(tx.body.blockRef.slice(0, 10))'), false)
    })

    it('refreshes activity and transfer async jobs from head block changes', () => {
        const updater = sourceFile('src/pages/ActivityStatusUpdater/Entry.ts')
        const notifier = sourceFile('src/pages/TransferNotifier.vue')

        assert.ok(updater.includes('headNumber(): number { return this.thor.status.head.number }'))
        assert.ok(updater.includes('headNumber() {\n            this.$asyncComputed.task.update()'))
        assert.ok(updater.includes('mounted() {\n        this.$asyncComputed.task.update()'))
        assert.ok(notifier.includes('headNumber(): number { return this.thor.status.head.number }'))
        assert.ok(notifier.includes('headNumber() {\n            this.$asyncComputed.events.update()'))
        assert.ok(notifier.includes('mounted() {\n        this.$asyncComputed.events.update()'))
    })

    it('keeps malformed stored wallet and activity JSON from crashing startup views', () => {
        const wallet = sourceFile('src/boot/services/wallet.ts')
        const activity = sourceFile('src/boot/services/activity.ts')
        const updater = sourceFile('src/pages/ActivityStatusUpdater/Entry.ts')

        assert.ok(wallet.includes('parseStoredRecord(value)'))
        assert.ok(wallet.includes('parseWalletMeta(e.meta, e.id)'))
        assert.strictEqual(wallet.includes('JSON.parse(e.meta)'), false)
        assert.ok(activity.includes('parseStoredRecord(value)'))
        assert.strictEqual(activity.includes('JSON.parse(e.glob)'), false)
        assert.ok(updater.includes('!/^0x[0-9a-f]+$/i.test(a.glob.encoded)'))
    })

    it('uses the checked-in macOS icon explicitly', () => {
        const source = sourceFile('quasar.config.cjs')

        assert.ok(source.includes("icon: 'src-electron/icons/icon.icns'"))
    })

    it('surfaces signing failures without reporting user-cancelled dialogs', () => {
        const txDialog = sourceFile('src/pages/Sign/TxDialog.vue')
        const certDialog = sourceFile('src/pages/Sign/CertDialog.vue')

        for (const source of [txDialog, certDialog]) {
            assert.ok(source.includes("import { dialogErrorMessage } from 'src/utils/dialog-error'"))
            assert.ok(source.includes('await this.sign()'))
            assert.ok(source.includes('dialogErrorMessage(err, this.$t(\'common.something_wrong\').toString())'))
        }
        assert.ok(txDialog.includes("throw new Error(this.$t('sign.msg_delegation_failed').toString())"))
        assert.ok(txDialog.includes("throw new Error(this.$t('sign.msg_generic_delegation_failed').toString())"))
    })
})
