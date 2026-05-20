<template>
    <q-list>
        <q-item class="justify-center">
            <q-item-section>
                <img
                    src="~/assets/backup.svg"
                    alt=""
                >
            </q-item-section>
        </q-item>
        <q-item-label
            header
            class="text-h6 text-dark"
        >{{title}}</q-item-label>
        <q-item>
            <q-item-section>
                <q-item-label
                    class="text-body2"
                    lines="3"
                >{{intro}}</q-item-label>
            </q-item-section>
        </q-item>
        <q-item>
            <q-item-section avatar>
                <q-avatar :icon="tips[0].icon" />
            </q-item-section>
            <q-item-section>
                <q-item-label>{{tips[0].label}}</q-item-label>
            </q-item-section>
        </q-item>
        <q-item>
            <q-item-section avatar>
                <q-avatar :icon="tips[1].icon" />
            </q-item-section>
            <q-item-section>
                <q-item-label>{{tips[1].label}}</q-item-label>
            </q-item-section>

        </q-item>
        <q-item>
            <q-item-section avatar>
                <q-avatar :icon="tips[2].icon" />
            </q-item-section>
            <q-item-section>
                <q-item-label>{{tips[2].label}}</q-item-label>
            </q-item-section>
        </q-item>
    </q-list>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

type BackupNoticeMode = 'mnemonic' | 'private-key'
type BackupTip = {
    icon: string
    label: string
}

export default defineComponent({
    props: {
        mode: {
            type: String as () => BackupNoticeMode,
            default: 'mnemonic'
        }
    },
    computed: {
        isPrivateKeyMode(): boolean {
            return this.mode === 'private-key'
        },
        title(): string {
            return this.isPrivateKeyMode
                ? this.$t('backup.label_private_key_backup_tips').toString()
                : this.$t('backup.label_backup_tips').toString()
        },
        intro(): string {
            return this.isPrivateKeyMode
                ? this.$t('backup.msg_private_key_backup_intro').toString()
                : this.$t('backup.msg_backup_intro').toString()
        },
        tips(): BackupTip[] {
            return this.isPrivateKeyMode
                ? [{
                    icon: 'vpn_key',
                    label: this.$t('backup.msg_private_key_backup_tips_1').toString()
                }, {
                    icon: 'offline_bolt',
                    label: this.$t('backup.msg_private_key_backup_tips_2').toString()
                }, {
                    icon: 'no_photography',
                    label: this.$t('backup.msg_private_key_backup_tips_3').toString()
                }]
                : [{
                    icon: 'create',
                    label: this.$t('backup.msg_backup_tips_1').toString()
                }, {
                    icon: 'place',
                    label: this.$t('backup.msg_backup_tips_2').toString()
                }, {
                    icon: 'no_photography',
                    label: this.$t('backup.msg_backup_tips_3').toString()
                }]
        }
    }
})
</script>
