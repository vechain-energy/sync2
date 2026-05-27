/* eslint-env mocha */
import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'

function sourceFile(file: string) {
    return fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
}

describe('UI regression guards', () => {
    it('renders exported private keys through the Vue 3 model prop', () => {
        const dialog = sourceFile('src/pages/Address/PrivateKeyDialog.vue')
        const page = sourceFile('src/pages/Backup/PrivateKey.vue')

        for (const source of [dialog, page]) {
            assert.ok(source.includes(':model-value="privateKey"'))
            assert.strictEqual(source.includes(':value="privateKey"'), false)
        }
    })

    it('backs up private keys through a warning page instead of an EXPORT prompt', () => {
        const address = sourceFile('src/pages/Address/Controller.vue')
        const backup = sourceFile('src/pages/Backup/Controller.vue')
        const panel = sourceFile('src/pages/Backup/BackupPanel.vue')
        const notice = sourceFile('src/pages/Backup/Notice.vue')
        const optionMenu = sourceFile('src/pages/Index/OptionMenu.vue')
        const en = sourceFile('src/i18n/en-us/index.ts')
        const zh = sourceFile('src/i18n/zh-cn/index.ts')

        assert.strictEqual(address.includes('PromptDialog'), false)
        assert.strictEqual(address.includes('EXPORT'), false)
        assert.ok(address.includes("query: { privateKey: '1', i: addressIndex.toString() }"))
        assert.ok(backup.includes("type BackupMode = 'mnemonic' | 'private-key'"))
        assert.ok(backup.includes("panel: 'notice' as BackupPanelName"))
        assert.ok(backup.includes("this.panel = 'private-key'"))
        assert.ok(panel.includes('name="private-key"'))
        assert.ok(panel.includes('copyPrivateKey'))
        assert.ok(panel.includes("this.mode === 'private-key' && this.meta.type !== 'private-key'"))
        assert.ok(notice.includes('label_private_key_backup_tips'))
        assert.ok(optionMenu.includes("hidden: this.wallet.meta.type === 'ledger'"))
        assert.strictEqual(en.includes('Type EXPORT'), false)
        assert.strictEqual(zh.includes('EXPORT'), false)
    })

    it('renders readonly Quasar input values through the Vue 3 model prop', () => {
        const swap = sourceFile('src/pages/Swap/Controller.vue')
        const inspectClause = sourceFile('src/pages/Sign/InspectClauseDialog.vue')

        assert.ok(swap.includes(':model-value="outputText"'))
        assert.strictEqual(swap.includes(':value="outputText"'), false)
        assert.ok(inspectClause.includes(':model-value="clause.data"'))
        assert.strictEqual(inspectClause.includes(':value="clause.data"'), false)
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

    it('shows primary .vet names for signer wallet groups', () => {
        const selector = sourceFile('src/pages/Sign/SignerSelector.vue')
        const item = sourceFile('src/pages/Sign/SignerItem.vue')
        const certDialog = sourceFile('src/pages/Sign/CertDialog.vue')

        assert.ok(selector.includes("import { firstVetDomainWalletName } from 'src/utils/vet-domain-wallet-name'"))
        assert.ok(selector.includes('groupVetNames: {'))
        assert.ok(selector.includes('this.$svc.bc(this.gid).vetDomainsRevision()'))
        assert.ok(selector.includes('this.$svc.bc(this.gid).vetDomainsNamesOf(group.addresses)'))
        assert.ok(selector.includes('return firstVetDomainWalletName(names)'))
        assert.ok(selector.includes('return groupVetNames[index] || group.name'))
        assert.ok(selector.includes(':caption="groupCaption"'))
        assert.ok(selector.includes(':resolveName="false"'))
        assert.ok(selector.includes('{{groupDisplayName(g, gi)}}'))
        assert.ok(item.includes('resolveName: {'))
        assert.ok(item.includes("return checksumed.slice(0, 6) + '⋯' + checksumed.slice(-6)"))
        assert.ok(certDialog.includes(':gid="gid"'))
    })

    it('keeps generic fee controls from overlapping fee token information', () => {
        const source = sourceFile('src/pages/Sign/GasFeeBar.vue')

        assert.ok(source.includes('flex-wrap: wrap'))
        assert.ok(source.includes('@media (max-width: 420px)'))
        assert.ok(source.includes('padding-left: 92px'))
    })

    it('keeps generic fee token selection compact and status-aware', () => {
        const source = sourceFile('src/pages/Sign/TxDialog.vue')

        assert.ok(source.includes('class="fee-token-menu"'))
        assert.ok(source.includes('class="fee-token-option-line"'))
        assert.ok(source.includes('<q-item-label class="fee-token-option-title">VTHO</q-item-label>'))
        assert.ok(source.includes('{{option.token}} · {{option.status}}'))
        assert.ok(source.includes("'text-negative': option.balanceLow"))
        assert.ok(source.includes('<q-btn-dropdown'))
        assert.ok(source.includes('toggle-aria-label="Fee token"'))
        assert.ok(source.includes('dropdown-icon="expand_more"'))
        assert.ok(source.includes('v-model="feeTokenMenuOpen"'))
        assert.ok(source.includes('menu-anchor="bottom right"'))
        assert.ok(source.includes('menu-self="top right"'))
        assert.ok(source.includes('width: min(304px, calc(100vw - 24px))'))
        assert.ok(source.includes('padding-right: 8px'))
    })

    it('keeps domain availability results single-source and network row non-empty', () => {
        const source = sourceFile('src/pages/Domains/Controller.vue')

        assert.ok(source.includes('networkDisplayName(): string'))
        assert.ok(source.includes('v-if="checking || info"'))
        assert.ok(source.includes('<transition name="domain-result-fade">'))
        assert.ok(source.includes('.domain-result-fade-enter-active'))
        assert.ok(source.includes('v-if="checking && !info"'))
        assert.ok(source.includes('v-else-if="info"'))
        assert.ok(source.includes('<q-item v-if="info && networkDisplayName">'))
        assert.ok(source.includes('{{networkDisplayName}}'))
        assert.ok(source.includes("this.statusText = this.info.available ? '' : this.$t('domains.msg_unavailable').toString()"))
        assert.strictEqual(source.includes("this.$t('domains.msg_available').toString()"), false)
    })

    it('parses transaction block references as hex for activity expiration checks', () => {
        const source = sourceFile('src/pages/ActivityStatusUpdater/status.ts')

        assert.ok(source.includes('Number.parseInt(tx.body.blockRef.slice(2, 10), 16)'))
        assert.strictEqual(source.includes('parseInt(tx.body.blockRef.slice(0, 10))'), false)
    })

    it('refreshes activity and transfer async jobs from head block changes', () => {
        const updater = sourceFile('src/pages/ActivityStatusUpdater/Entry.ts')
        const notifier = sourceFile('src/pages/TransferNotifier.vue')

        assert.ok(updater.includes('headNumber(): number { return this.thor.status.head.number }'))
        assert.ok(updater.includes('headNumber() {\n            void this.updateStatus()'))
        assert.ok(updater.includes('mounted() {\n        void this.updateStatus()'))
        assert.strictEqual(updater.includes('asyncComputed'), false)
        assert.ok(notifier.includes('headNumber(): number { return this.thor.status.head.number }'))
        assert.ok(notifier.includes('headNumber() {\n            this.$asyncComputed.events.update()'))
        assert.ok(notifier.includes('mounted() {\n        this.$asyncComputed.events.update()'))
    })

    it('keeps activity rows expandable and the drawer badge pending-only', () => {
        const item = sourceFile('src/pages/Activities/Item.vue')
        const drawer = sourceFile('src/pages/Index/DrawerPanel.vue')
        const updater = sourceFile('src/pages/ActivityStatusUpdater/Controller.vue')

        assert.strictEqual(item.includes('expand-icon-class="hidden"'), false)
        assert.ok(item.includes('expand-icon="keyboard_arrow_down"'))
        assert.ok(item.includes('class="activity-item-details"'))
        assert.ok(drawer.includes('countPendingTxActivities(activities'))
        assert.ok(drawer.includes('thor.status.head.number'))
        assert.ok(updater.includes('uncompletedTxActivities'))
    })

    it('keeps Send MAX balance-backed and non-submitting', () => {
        const send = sourceFile('src/pages/Send/Controller.vue')

        assert.ok(send.includes(':label="$t(\'send.action_max\')"'))
        assert.ok(send.includes('type="button"'))
        assert.ok(send.includes('currentBalance: {'))
        assert.ok(send.includes('this.$svc.bc(token.gid).balanceOf(this.address, token)'))
        assert.ok(send.includes('canSetMax(): boolean'))
        assert.ok(send.includes('setMaxAmount(): void'))
        assert.ok(send.includes('rawTokenAmountToInput(this.currentBalance, token.decimals)'))
        assert.ok(send.includes("this.errors.amount = ''"))
    })

    it('shows full transfer details from asset history rows', () => {
        const logItem = sourceFile('src/pages/Asset/LogItem.vue')

        assert.strictEqual(logItem.includes('expand-icon-class="hidden"'), false)
        assert.ok(logItem.includes('expand-icon="keyboard_arrow_down"'))
        assert.ok(logItem.includes('expanded-icon="keyboard_arrow_up"'))
        assert.ok(logItem.includes('asset-log-details'))
        for (const key of [
            'asset.label_from',
            'asset.label_to',
            'asset.label_amount',
            'asset.label_token',
            'asset.label_time',
            'asset.label_block',
            'asset.label_tx_hash'
        ]) {
            assert.ok(logItem.includes(key))
        }
        assert.ok(logItem.includes('copy(log.meta.txID)'))
        assert.ok(logItem.includes('viewOnExplorer'))
        assert.ok(logItem.includes('text-caption'))
        assert.ok(logItem.includes('asset-log-hash'))
        assert.ok(logItem.includes('shortTxID(): string'))
        assert.ok(logItem.includes('txID.slice(0, 10)'))
        assert.ok(logItem.includes('txID.slice(-8)'))
        assert.ok(logItem.includes('min-height: 26px'))
        assert.ok(logItem.includes('line-height: 1.35'))
        assert.ok(logItem.includes('white-space: normal'))
        assert.strictEqual(logItem.includes('text-overflow: ellipsis'), false)
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
        assert.ok(updater.includes('parseStoredTx(activity.glob.encoded)'))
    })

    it('uses the checked-in macOS icon explicitly', () => {
        const source = sourceFile('quasar.config.cjs')

        assert.ok(source.includes("icon: 'src-electron/icons/icon.icns'"))
    })

    it('keeps Upgrade Now actionable for unsigned Electron releases', () => {
        const source = sourceFile('src/pages/Index/UpgradeTip.vue')
        const app = sourceFile('src/App.vue')
        const state = sourceFile('src/boot/misc/state.ts')

        assert.ok(source.includes('installing: false'))
        assert.ok(source.includes(':loading="installing"'))
        assert.ok(source.includes("openURL(this.$state.app.updateReleaseUrl || latestReleaseUrl())"))
        assert.ok(source.includes("this.$t('index.msg_upgrade_failed').toString()"))
        assert.ok(source.includes("console.warn('reload update:', err)"))
        assert.strictEqual(source.includes('quitAndInstall'), false)
        assert.ok(app.includes('releaseUrlForVersion(info.version)'))
        assert.ok(state.includes('updateReleaseUrl: string'))
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

    it('blocks generic fee signing when the selected fee token balance is too low', () => {
        const txDialog = sourceFile('src/pages/Sign/TxDialog.vue')

        assert.ok(txDialog.includes('genericFeeBalanceLow(): boolean'))
        assert.ok(txDialog.includes('this.genericFeeBalanceLow'))
        assert.ok(txDialog.includes('if (genericToken && this.genericFeeWarning)'))
        assert.ok(txDialog.includes('message: this.genericFeeWarning.message'))
    })

    it('keeps domain signer ordering safe when selected wallet state changes', () => {
        const domains = sourceFile('src/pages/Domains/Controller.vue')

        assert.ok(domains.includes('const selectedWallet = this.selectedWallet'))
        assert.ok(domains.includes('if (!selectedWallet || !this.selectedAddress)'))
        assert.ok(domains.includes('wallet.gid === selectedWallet.gid'))
        assert.strictEqual(domains.includes('this.selectedWallet!.gid'), false)
    })

    it('passes clause dialog props through Quasar componentProps', () => {
        const txDialog = sourceFile('src/pages/Sign/TxDialog.vue')
        const inspectClause = sourceFile('src/pages/Sign/InspectClauseDialog.vue')

        assert.ok(txDialog.includes('component: InspectClauseDialog'))
        assert.ok(txDialog.includes('componentProps: {\n                    index,\n                    clause,\n                    gid: this.gid\n                }'))
        assert.ok(inspectClause.includes('Clause · {{clauseNumber}}'))
        assert.ok(inspectClause.includes('clauseNumber(): number'))
        assert.strictEqual(inspectClause.includes('Clause · {{index+1}}'), false)
    })

    it('uses clause comments as transaction request summary fallback', () => {
        const summary = sourceFile('src/pages/Sign/Summary.vue')

        assert.ok(summary.includes('txSummaryText(): string'))
        assert.ok(summary.includes("tx.message.find(clause => !!clause.comment)?.comment || 'N/A'"))
    })
})
