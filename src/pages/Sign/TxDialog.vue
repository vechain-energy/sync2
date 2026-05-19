<template>
    <q-dialog
        ref="dialog"
        @hide="$emit('hide')"
        maximized
        transition-show="slide-up"
        transition-hide="slide-down"
    >
        <q-card class="column no-wrap">
            <page-toolbar
                :title="$t('common.transaction')"
                icon="close"
                :gid="gid"
                @action="hide()"
            />
            <page-content
                class="col q-pa-sm bg-grey-3"
                innerClass="q-gutter-y-sm"
            >
                <clause-card
                    v-for="(c, i) in req.message"
                    :key="i"
                    :index="i"
                    :clause="c"
                    :tokens="tokens"
                    :gid="gid"
                    @click="onClickClause(i, c)"
                />
            </page-content>
            <page-content size="xs">
                <error-tip
                    v-if="criticalError"
                    :error="criticalError"
                />
                <template v-else>
                    <error-tip
                        v-if="warnings.length > 0"
                        type="warning"
                        :error="{name: this.$t('sign.label_transaction_warning')}"
                        clickable
                        @click="showWarnings()"
                    />

                    <gas-fee-bar :fee="fee" :maxFee="maxFee" :isDelegation="isDelegation">
                        <priority-selector
                            v-model="feePriority"
                            :calcFee="calcFee"
                        />
                    </gas-fee-bar>
                    <signer-selector
                        :signer="signer"
                        :groups="signerGroups"
                        :gid="gid"
                        @select="signer=$event"
                    />
                </template>
            </page-content>
            <page-action class="q-mt-md">
                <q-btn
                    v-if="criticalError"
                    outline
                    color="primary"
                    :label="$t('common.close')"
                    @click="hide()"
                />
                <q-btn
                    v-else
                    unelevated
                    color="primary"
                    :label="signActionLabel"
                    @click="onClickSign()"
                    :loading="thor.status.head.number === 0"
                />
            </page-action>
        </q-card>
    </q-dialog>
</template>
<script lang="ts">
import Common from './Common'
import { QDialog } from 'quasar'
import PageToolbar from 'src/components/PageToolbar.vue'
import PageContent from 'src/components/PageContent.vue'
import PageAction from 'src/components/PageAction.vue'
import SignerSelector from './SignerSelector.vue'
import { estimateGas, EstimateGasResult, decodeAsTokenTransferClause } from './helper'
import PrioritySelector from './PrioritySelector.vue'
import GasFeeBar from './GasFeeBar.vue'
import ClauseCard from './ClauseCard'
import { Transaction } from 'thor-devkit'
import { BigNumber } from 'bignumber.js'
import { randomBytes } from 'crypto'
import ErrorTip from './ErrorTip.vue'
import WarningListDialog from './WarningListDialog.vue'
import InspectClauseDialog from './InspectClauseDialog.vue'
import {
    FeePriority,
    buildDynamicFeeTxBody,
    calcCurrentFee,
    calcMaxFee,
    calcMaxFeePerGas,
    calcPriorityFeePerGas
} from './fee-market'

type AsyncComputedState = {
    $asyncComputed: {
        delayedEstimation: {
            exception?: Error
        }
    }
}

export default Common.extend({
    components: { PageToolbar, PageContent, PageAction, SignerSelector, PrioritySelector, GasFeeBar, ClauseCard, ErrorTip },
    props: {
        req: Object as () => M.TxRequest
    },
    data() {
        return {
            feePriority: FeePriority.Regular
        }
    },
    computed: {
        calcFee() {
            const est = this.estimation
            if (!est) {
                return null
            }
            return (priority: number) => {
                const priorityFeePerGas = calcPriorityFeePerGas(est.feeMarket.priorityFee, priority)
                return calcCurrentFee(est.gas, est.feeMarket.baseFeePerGas, priorityFeePerGas).toString()
            }
        },
        priorityFeePerGas(): BigNumber | null {
            const est = this.estimation
            return est ? calcPriorityFeePerGas(est.feeMarket.priorityFee, this.feePriority) : null
        },
        maxFeePerGas(): BigNumber | null {
            const est = this.estimation
            const priorityFeePerGas = this.priorityFeePerGas
            return est && priorityFeePerGas ? calcMaxFeePerGas(est.feeMarket.baseFeePerGas, priorityFeePerGas) : null
        },
        fee(): string | null {
            return this.calcFee ? this.calcFee(this.feePriority) : null
        },
        maxFee(): string | null {
            const est = this.estimation
            const maxFeePerGas = this.maxFeePerGas
            return est && maxFeePerGas ? calcMaxFee(est.gas, maxFeePerGas).toString() : null
        },
        criticalError(): Error | null {
            if (!this.wallet) {
                return { name: this.$t('sign.label_critical_error').toString(), message: this.signerGroups.length > 0 ? this.$t('sign.msg_address_not_owned').toString() : this.$t('common.no_wallet').toString() }
            }
            // test vip191 feature bit when delegator set
            const head = this.thor.status.head
            if (head.number > 0 && this.req.options.delegator && !((head.txsFeatures || 0) & 1)) {
                return { name: this.$t('sign.label_critical_error').toString(), message: this.$t('sign.msg_vip191_not_supported').toString() }
            }
            const vm = this as unknown as AsyncComputedState
            const estimationException = vm.$asyncComputed.delayedEstimation.exception
            if (head.number > 0 && estimationException) {
                return { name: this.$t('sign.label_critical_error').toString(), message: estimationException.message }
            }
            return null
        },
        warnings(): Error[] {
            const ret: Error[] = []
            if (this.estimation) {
                const { reverted, vmError, revertReason } = this.estimation
                if (reverted) {
                    ret.push({
                        name: this.$t('sign.label_vm_error').toString(),
                        message: revertReason ? `${vmError} (${revertReason})` : `${vmError}`
                    })
                }
            }
            this.energyWarning && ret.push(this.energyWarning)
            return ret
        },
        isDelegation(): boolean {
            return !!this.req.options.delegator
        },
        signActionLabel(): string {
            return this.req.actionLabel || this.$t('sign.action_sign').toString()
        },
        thor(): Connex.Thor { return this.$svc.bc(this.gid).thor },
        estimation(): EstimateGasResult | null {
            if (this.delayedEstimation && this.delayedEstimation.caller === this.signer) {
                return this.delayedEstimation
            }
            return null
        }
    },
    asyncComputed: {
        // the result may not match the current signer
        delayedEstimation(): Promise<EstimateGasResult | null> {
            if (!this.wallet || this.thor.status.head.number === 0) {
                return Promise.resolve(null)
            }
            return estimateGas(
                this.thor,
                this.req.message,
                this.req.options.gas || 0,
                this.signer,
                this.req.options.delegator && this.req.options.delegator.signer)
        },
        tokens: {
            async get(): Promise<M.TokenSpec[]> {
                const all = await this.$svc.config.token.all()
                return all.filter(spec => spec.gid === this.gid)
            },
            default: []
        },
        async energyWarning(): Promise<Error | null> {
            const est = this.estimation
            const fee = this.maxFee
            if (!est || !fee || (this.req.options.delegator && !this.req.options.delegator.signer)) {
                return null
            }
            const signer = this.signer
            const gasPayer = (this.req.options.delegator && this.req.options.delegator.signer) || signer
            const acc = await this.thor.account(gasPayer).get()

            let energyBalance = new BigNumber(acc.energy)

            if (gasPayer === signer) {
                // in the case signer is the gas payer, we deduct the balance with VTHO out amount
                const vthoSpec = this.tokens.find(t => t.symbol === 'VTHO')
                if (vthoSpec) {
                    for (const c of this.req.message) {
                        const r = decodeAsTokenTransferClause(c, vthoSpec)
                        if (r) {
                            energyBalance = energyBalance.minus(r.amount)
                        }
                    }
                }
            }
            if (energyBalance.isLessThan(fee)) {
                return { name: this.$t('sign.label_insufficient_vtho').toString(), message: this.$t('sign.msg_insufficient_vtho').toString() }
            }
            return null
        }
    },
    methods: {
        // method is REQUIRED by $q.dialog
        show() { (this.$refs.dialog as QDialog).show() },
        // method is REQUIRED by $q.dialog
        hide() { (this.$refs.dialog as QDialog).hide() },

        ok(result: M.TxResponse) {
            this.$emit('ok', result)
            this.hide()
        },
        showWarnings() {
            this.$q.dialog({
                component: WarningListDialog,
                parent: this,
                warnings: this.warnings,
                noAction: true
            })
        },
        async onClickSign() {
            const est = this.estimation
            const wallet = this.wallet
            const signer = this.signer
            const priorityFeePerGas = this.priorityFeePerGas
            const maxFeePerGas = this.maxFeePerGas

            if (!est || !wallet || !priorityFeePerGas || !maxFeePerGas) {
                return
            }

            if (est.reverted) {
                await this.$dialog({
                    component: WarningListDialog,
                    title: this.$t('sign.label_transaction_warning').toString(),
                    warnings: this.warnings
                })
            }

            let tx!: Transaction<Transaction.DynamicFeeBody>
            let delegatorSig: Buffer | undefined

            const originSig = await this.signTx(wallet, signer, () => {
                // compose the tx body
                const txBody = buildDynamicFeeTxBody(
                    this.thor.genesis.id,
                    this.thor.status.head.id,
                    this.req.message,
                    est.gas,
                    priorityFeePerGas,
                    maxFeePerGas,
                    this.req.options.dependsOn,
                    '0x' + randomBytes(8).toString('hex')
                )

                return this.$loading(async () => {
                    const delegator = this.req.options.delegator
                    if (delegator) {
                        tx = new Transaction({ ...txBody, reserved: { features: Transaction.DELEGATED_MASK } })
                        try {
                            const resp = await this.$axios.post(delegator.url, {
                                raw: '0x' + tx.encode().toString('hex'),
                                origin: signer
                            }, { transformResponse: data => JSON.parse(data), headers: { 'content-type': 'application/json' } })
                            delegatorSig = Buffer.from(resp.data.signature.slice(2), 'hex')
                        } catch (err) {
                            this.$q.notify({
                                type: 'negative',
                                message: this.$t('sign.msg_delegation_failed').toString()
                            })
                            // rethrow to end the process
                            throw err
                        }
                    } else {
                        tx = new Transaction(txBody)
                    }
                    return tx
                })
            })

            tx.signature = delegatorSig ? Buffer.concat([originSig, delegatorSig]) : originSig

            const encoded = '0x' + tx.encode().toString('hex')
            this.$svc.bc(this.gid).commitTx(encoded)

            this.$svc.activity.add({
                gid: this.gid,
                walletId: wallet.id,
                createdTime: Date.now(),
                status: '',
                type: 'tx',
                glob: {
                    id: tx.id!,
                    encoded,
                    signer,
                    comment: this.req.options.comment || '',
                    receipt: null,
                    origin: this.req.origin || '',
                    link: this.req.options.link || ''
                }
            })

            this.ok({
                txid: tx.id!,
                signer
            })
        },
        onClickClause(index: number, clause: Connex.Vendor.TxMessage[0]) {
            this.$q.dialog({
                parent: this,
                component: InspectClauseDialog,
                index,
                clause,
                gid: this.gid
            })
        }
    }
})
</script>
