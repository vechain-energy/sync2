<template>
    <div class="column fit">
        <page-toolbar :title="$t('backup.title')" />
        <backup-panel
            :wallet-id="id"
            :panel="panel"
            :words="words"
            :meta="meta"
            @start="onStart"
            @done="onDone"
            @next="next"
        />
    </div>
</template>
<script lang="ts">
import Vue from 'vue'
import { Vault } from 'src/core/vault'
import PageToolbar from 'src/components/PageToolbar.vue'
import BackupPanel from './BackupPanel.vue'

export default Vue.extend({
    props: {
        walletId: String
    },
    components: {
        PageToolbar,
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
            const wallet = await this.$svc.wallet.get(parseInt(this.walletId, 10))
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
