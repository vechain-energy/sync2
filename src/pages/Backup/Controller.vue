<template>
    <div class="column fit">
        <page-toolbar :title="$t('backup.title')" />
        <backup-panel
            v-if="canStartBackup"
            :wallet-id="id"
            :panel="panel"
            :words="words"
            :meta="meta"
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

export default defineComponent({
    props: {
        walletId: String
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
            panel: 'notice' as 'notice' | 'words' | 'check' | 'done',
            meta: {} as M.Wallet.Meta,
            words: [] as string[]
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
        canStartBackup(): boolean {
            return !!this.wallet && this.wallet.meta.type === 'hd'
        },
        invalidContextMessage(): string {
            return this.wallet
                ? this.$t('backup.msg_mnemonic_backup_only').toString()
                : this.$t('backup.msg_wallet_not_found').toString()
        }
    },
    methods: {
        next() {
            switch (this.panel) {
                case 'notice':
                    this.panel = 'words'
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
            if (wallet.meta.type !== 'hd') {
                this.$q.notify(this.$t('backup.msg_mnemonic_backup_only'))
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
                        .split(' ')
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
        onDone() {
            this.$router.back()
        }
    }
})
</script>
