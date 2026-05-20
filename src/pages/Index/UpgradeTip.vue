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
                    @click="reloadApp"
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
export default defineComponent({
    data() {
        return {
            installing: false
        }
    },
    methods: {
        async reloadApp() {
            if (this.installing) {
                return
            }

            this.installing = true
            try {
                if (process.env.MODE === 'electron') {
                    await require('@electron/remote')
                        .app
                        .updater
                        .quitAndInstall()
                } else {
                    window.location.reload()
                }
            } catch (err) {
                console.warn('install update:', err)
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
