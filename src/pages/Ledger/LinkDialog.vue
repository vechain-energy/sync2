<template>
    <q-dialog
        ref="dialog"
        @hide="$emit('hide')"
        :position="$q.screen.xs ? 'bottom': 'standard'"
        :no-backdrop-dismiss="!$q.screen.xs"
    >
        <q-card class="full-width">
            <prompt-dialog-toolbar>Ledger</prompt-dialog-toolbar>
            <q-card-section>
                <Steps
                    :titles="steps.map(s => s.title)"
                    :step="currentStepNum"
                    :hint="hint"
                    :error="error"
                />
            </q-card-section>
            <q-card-actions>
                <q-btn
                    v-disableFocusHelper
                    class="w40 q-mx-auto"
                    :disable="!account"
                    unelevated
                    color="primary"
                    :label= "$t('ledger.label_link')"
                    @click="onSubmit()"
                />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { QDialog } from 'quasar'
import * as Ledger from 'src/utils/ledger'
import PromptDialogToolbar from 'src/components/PromptDialogToolbar.vue'
import { sleep } from 'src/utils/sleep'
import Steps from './Steps.vue'

type Status = 'connected' | 'done'
type Step = {
    status: Status
    title: string
    hint: string
}

export default defineComponent({
    emits: ['hide', 'ok'],
    components: { PromptDialogToolbar, Steps },
    data() {
        return {
            status: null as Status | null,
            account: null as Ledger.Account | null,
            error: null as Error | null,
            task: null as Ledger.LedgerTask<Ledger.Account> | null
        }
    },
    computed: {
        steps(): Step[] {
            return [
                {
                    status: 'connected',
                    title: this.$t('ledger.title_connecting').toString(),
                    hint: this.$t('ledger.msg_connecting').toString()
                },
                {
                    status: 'done',
                    title: this.$t('ledger.title_reading_data').toString(),
                    hint: this.$t('ledger.msg_checking_status').toString()
                }
            ]
        },
        currentStepNum(): number {
            return this.steps.findIndex(s => s.status === this.status) + 1
        },
        hint(): string {
            return this.currentStepNum < this.steps.length ? this.steps[this.currentStepNum].hint : ''
        }
    },
    async mounted() {
        for (; ;) {
            try {
                this.error = null
                this.status = null
                this.task = Ledger.getAccount(status => {
                    if (status === 'connected' || status === 'done') {
                        this.status = status
                    }
                })
                this.account = await this.task.promise
            } catch (err) {
                if (err instanceof Ledger.LedgerOperationError && err.code === 'cancelled') {
                    break
                }

                console.warn(err)
                if (
                    err instanceof Ledger.LedgerOperationError &&
                    err.code !== 'timeout' &&
                    (err.stage === 'connect' || err.stage === 'account')
                ) {
                    if (process.env.MODE === 'spa' || process.env.MODE === 'pwa') {
                        this.error = err
                        break
                    }
                    await sleep(2000)
                    continue
                }

                this.error = err instanceof Error ? err : new Error(this.$t('common.something_wrong').toString())
            } finally {
                this.task = null
            }
            break
        }
    },
    beforeUnmount() {
        this.task?.cancel()
    },
    methods: {
        // method is REQUIRED by $q.dialog
        show() { (this.$refs.dialog as QDialog).show() },
        // method is REQUIRED by $q.dialog
        hide() { (this.$refs.dialog as QDialog).hide() },
        ok(result: Ledger.Account) {
            this.$emit('ok', result)
            this.hide()
        },
        onSubmit() {
            this.account && this.ok(this.account)
        }
    }
})
</script>
