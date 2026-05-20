<template>
    <q-dialog
        @hide="$emit('hide')"
        ref="dialog"
        position="bottom"
    >
        <q-card class="full-width">
            <q-toolbar>
                <q-toolbar-title class="text-center">
                    {{req.title}}
                </q-toolbar-title>
            </q-toolbar>
            <q-card-section>
                <q-responsive
                    class="q-mx-auto qr-code-frame"
                    :ratio="1"
                >
                    <q-r-code class="full-width">{{req.content}}</q-r-code>
                </q-responsive>
                <div
                    v-if="req.caption"
                    class="qr-code-caption text-center"
                >{{req.caption}}</div>
                <div
                    v-if="req.message"
                    :class="[req.messageClass, 'break-all']"
                >{{req.message}}</div>
            </q-card-section>
            <q-card-actions>
                <q-btn
                    @click="onCopy"
                    class="w40 q-mx-auto"
                    unelevated
                    color="primary"
                >{{$t('common.copy')}}</q-btn>
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { QDialog } from 'quasar'
import QRCode from 'components/QRCode.vue'
import { copyText } from 'src/utils/clipboard'
export default defineComponent({
    emits: ['hide'],
    components: {
        QRCode
    },
    props: {
        req: Object as () => M.QRRequest
    },
    methods: {
        // method is REQUIRED by $q.dialog
        show() { (this.$refs.dialog as QDialog).show() },
        // method is REQUIRED by $q.dialog
        hide() { (this.$refs.dialog as QDialog).hide() },
        async onCopy() {
            try {
                await copyText(this.req.content)
                this.$q.notify(this.$t('common.copied').toString())
            } catch {
                this.$q.notify({
                    type: 'negative',
                    message: this.$t('common.copy_failed').toString()
                })
            }
        }
    }
})
</script>
<style scoped>
.qr-code-frame {
    max-width: 240px;
}

.qr-code-caption {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 16px;
}

.break-all {
    word-break: break-all;
}
</style>
