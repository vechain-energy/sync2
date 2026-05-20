<template>
    <div class="q-pa-xs">
        <q-banner
            dark
            dense
            rounded
            inline-actions
            class="bg-positive"
        >
            <template v-slot:avatar>
                <q-icon name="upgrade" />
            </template>
            {{$t('index.msg_upgrade')}}
            <template v-slot:action>
                <q-btn
                    @click="upgradeNow"
                    flat
                    :loading="installing"
                    :label="$t('index.action_upgrade')"
                />
            </template>
        </q-banner>
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { openURL } from 'src/utils/open-url'
import { latestReleaseUrl } from 'src/utils/release-url'

export default defineComponent({
    data() {
        return {
            installing: false
        }
    },
    methods: {
        upgradeNow() {
            if (this.installing) {
                return
            }

            if (process.env.MODE === 'electron') {
                this.openRelease()
                return
            }

            void this.reloadApp()
        },
        openRelease() {
            const opened = openURL(this.$state.app.updateReleaseUrl || latestReleaseUrl())
            if (opened) {
                return
            }

            this.$q.notify({
                type: 'negative',
                message: this.$t('index.msg_upgrade_failed').toString()
            })
        },
        async reloadApp() {
            this.installing = true
            try {
                window.location.reload()
            } catch (err) {
                console.warn('reload update:', err)
                this.installing = false
                this.$q.notify({
                    type: 'negative',
                    message: this.$t('index.msg_upgrade_failed').toString()
                })
            }
        }
    }
})
</script>
