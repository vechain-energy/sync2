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
                    :titles="steps.map(s=> s.title)"
                    :step="currentStepNum"
                    :hint="hint"
                    :error="error"
                />
            </q-card-section>
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

type Status = 'connected' | 'handshaked' | 'signed'
type Step = {
    status: Status
    title: string
    hint: string
}

type Arg = {
    signer: string,
    index: number,
    tx?: Buffer,
    cert?: Buffer
}

export default defineComponent({
    emits: ['hide', 'ok'],
    components: { PromptDialogToolbar, Steps },
    props: {
        arg: Object as () => Arg
    },
    data() {
        return {
            status: null as Status | null,
            error: null as Error | null,
            task: null as Ledger.LedgerTask<Buffer> | null
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
                    status: 'handshaked',
                    title: this.$t('ledger.title_checking_status').toString(),
                    hint: this.$t('ledger.msg_checking_status').toString()
                },
                {
                    status: 'signed',
                    title: this.$t('ledger.title_signing_data').toString(),
                    hint: this.$t('ledger.msg_signing_data').toString()
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
        const { index, signer, tx, cert } = { ...this.arg }

        for (; ;) {
            try {
                this.error = null
                this.status = null
                if (tx) {
                    this.task = Ledger.signTransaction({ signer, index, payload: tx }, status => {
                        this.status = status as Status
                    })
                } else if (cert) {
                    this.task = Ledger.signJSON({ signer, index, payload: cert }, status => {
                        this.status = status as Status
                    })
                } else {
                    this.error = new Error(this.$t('ledger.msg_unknown_data').toString())
                    break
                }

                const sig = await this.task.promise
                await sleep(1000)
                this.ok(sig)
            } catch (err) {
                if (err instanceof Ledger.LedgerOperationError && err.code === 'cancelled') {
                    break
                }

                console.warn(err)
                if (err instanceof Ledger.LedgerOperationError && err.code === 'wrong-device') {
                    this.error = new Error(this.$t('ledger.msg_wrong_device').toString())
                    break
                }
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
        ok(result: Buffer) {
            this.$emit('ok', result)
            this.hide()
        }
    }
})
</script>
