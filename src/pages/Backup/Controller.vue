<template>
    <div class="column fit">
        <page-toolbar :title="backupTitle" />
        <backup-panel
            v-if="canStartBackup"
            :wallet-id="id"
            :panel="panel"
            :mode="backupMode"
            :words="words"
            :meta="meta"
            :private-key="privateKeyText"
            :address="privateKeyAddress"
            @start="onStart"
            @done="onDone"
            @next="next"
        />
        <template v-else>
            <page-content class="col">
                <q-item-label header>
                    {{invalidContextMessage}}
                </q-item-label>
            </page-content>
            <page-action>
                <q-btn
                    unelevated
                    class="col-6 col-sm-auto"
                    color="primary"
                    :label="$t('common.back')"
                    @click="$backOrHome()"
                />
            </page-action>
        </template>
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { Vault } from 'src/core/vault'
import PageToolbar from 'src/components/PageToolbar.vue'
import PageContent from 'src/components/PageContent.vue'
import PageAction from 'src/components/PageAction.vue'
import BackupPanel from './BackupPanel.vue'
import { parseRouteInteger } from 'src/utils/route'
import { formatPrivateKey } from 'src/utils/private-key'
import { unlockPrivateKeyForBackup } from 'src/utils/private-key-backup'

type BackupMode = 'mnemonic' | 'private-key'
type BackupPanelName = 'notice' | 'words' | 'check' | 'private-key' | 'done'

export default defineComponent({
    props: {
        walletId: String,
        i: String,
        privateKey: String
    },
    components: {
        PageToolbar,
        PageContent,
        PageAction,
        BackupPanel
    },
    data() {
        return {
            id: -1,
            panel: 'notice' as BackupPanelName,
            meta: {} as M.Wallet.Meta,
            words: [] as string[],
            privateKeyText: ''
        }
    },
    asyncComputed: {
        wallet(): Promise<M.Wallet | null> {
            const id = this.walletIdNumber
            return id === null ? Promise.resolve(null) : this.$svc.wallet.get(id)
        }
    },
    computed: {
        walletIdNumber(): number | null {
            return parseRouteInteger(this.walletId)
        },
        routeAddressIndexNumber(): number | null {
            return parseRouteInteger(this.i)
        },
        backupMode(): BackupMode {
            return this.privateKey === '1' || this.wallet?.meta.type === 'private-key'
                ? 'private-key'
                : 'mnemonic'
        },
        backupTitle(): string {
            return this.backupMode === 'private-key'
                ? this.$t('backup.title_private_key').toString()
                : this.$t('backup.title').toString()
        },
        privateKeyAddressIndex(): number | null {
            const routeIndex = this.routeAddressIndexNumber
            return routeIndex === null ? 0 : routeIndex
        },
        privateKeyAddress(): string {
            const wallet = this.wallet
            const index = this.privateKeyAddressIndex
            return wallet && index !== null ? wallet.meta.addresses[index] || '' : ''
        },
        canStartBackup(): boolean {
            const wallet = this.wallet
            if (!wallet) {
                return false
            }
            if (this.backupMode === 'private-key') {
                return wallet.meta.type !== 'ledger' && !!this.privateKeyAddress
            }
            return wallet.meta.type === 'hd'
        },
        invalidContextMessage(): string {
            if (!this.wallet) {
                return this.$t('backup.msg_wallet_not_found').toString()
            }
            return this.backupMode === 'private-key'
                ? this.$t('backup.msg_private_key_backup_only').toString()
                : this.$t('backup.msg_mnemonic_backup_only').toString()
        }
    },
    methods: {
        next() {
            switch (this.panel) {
                case 'notice':
                    this.panel = this.backupMode === 'private-key' ? 'private-key' : 'words'
                    break
                case 'words':
                    this.panel = 'check'
                    break
                case 'check':
                    this.panel = 'done'
                    break
            }
        },
        async onStart() {
            const wallet = this.wallet
            if (!wallet) {
                this.$q.notify(this.$t('backup.msg_wallet_not_found'))
                this.$backOrHome()
                return
            }
            if (this.backupMode === 'private-key') {
                await this.onStartPrivateKey(wallet)
                return
            }
            await this.onStartMnemonic(wallet)
        },
        async onStartMnemonic(wallet: M.Wallet) {
            if (wallet.meta.type !== 'hd') {
                this.$q.notify(this.$t('backup.msg_mnemonic_backup_only').toString())
                this.$backOrHome()
                return
            }

            this.id = wallet.id
            this.meta = wallet.meta
            try {
                const umk = await this.$authenticate()
                try {
                    const vault = Vault.decode(wallet.vault)
                    this.words = vault.decrypt(umk)
                        .toString('utf8')
                        .trim()
                        .split(/\s+/)
                    this.next()
                } catch {
                    this.$q.notify({
                        type: 'negative',
                        message: this.$t('backup.msg_backup_load_failed').toString()
                    })
                    this.$backOrHome()
                }
            } catch { }
        },
        async onStartPrivateKey(wallet: M.Wallet) {
            const addressIndex = this.privateKeyAddressIndex
            const targetAddress = this.privateKeyAddress
            if (wallet.meta.type === 'ledger' || addressIndex === null || !targetAddress) {
                this.$q.notify(this.$t('backup.msg_private_key_backup_only').toString())
                this.$backOrHome()
                return
            }

            this.id = wallet.id
            this.meta = wallet.meta
            try {
                const umk = await this.$authenticate()
                try {
                    await this.$loading(() => {
                        const key = unlockPrivateKeyForBackup(wallet, targetAddress, addressIndex, umk)
                        try {
                            this.privateKeyText = formatPrivateKey(key)
                        } finally {
                            key.fill(0)
                        }
                        return Promise.resolve()
                    })
                    this.panel = 'private-key'
                } catch (err) {
                    console.warn(err)
                    this.$q.notify({
                        type: 'negative',
                        message: this.$t('backup.msg_private_key_backup_load_failed').toString()
                    })
                    this.$backOrHome()
                }
            } catch { }
        },
        onDone() {
            this.privateKeyText = ''
            this.$router.back()
        }
    }
})
</script>
