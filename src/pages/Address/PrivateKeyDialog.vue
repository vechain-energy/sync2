<template>
    <q-dialog
        ref="dialog"
        @hide="$emit('hide')"
        :position="$q.screen.xs ? 'bottom': 'standard'"
        :no-backdrop-dismiss="!$q.screen.xs"
    >
        <q-card class="full-width">
            <prompt-dialog-toolbar>{{$t('address.title_export_private_key')}}</prompt-dialog-toolbar>
            <q-card-section>
                <q-banner class="bg-red-1 text-negative q-mb-md">
                    {{$t('address.msg_private_key_reveal_warning')}}
                </q-banner>
                <q-input
                    readonly
                    outlined
                    type="textarea"
                    input-class="monospace"
                    :label="$t('address.label_private_key')"
                    :value="privateKey"
                />
            </q-card-section>
            <q-card-actions align="between">
                <q-btn
                    flat
                    color="primary"
                    :label="$t('common.close')"
                    @click="hide"
                />
                <q-btn
                    unelevated
                    color="negative"
                    icon="content_copy"
                    :label="$t('common.copy')"
                    @click="copy"
                />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { QDialog } from 'quasar'
import PromptDialogToolbar from 'src/components/PromptDialogToolbar.vue'
import { copyText } from 'src/utils/clipboard'

export default defineComponent({
    emits: ['hide'],
    components: { PromptDialogToolbar },
    props: {
        privateKey: String
    },
    methods: {
        // method is REQUIRED by $q.dialog
        show() { (this.$refs.dialog as QDialog).show() },
        // method is REQUIRED by $q.dialog
        hide() { (this.$refs.dialog as QDialog).hide() },
        async copy() {
            try {
                await copyText(this.privateKey)
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
