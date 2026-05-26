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
                :action="() => hide()"
            />
            <page-content
                class="col q-pa-sm bg-grey-3"
                innerClass="q-gutter-y-sm"
            >
                <clause-card
                    v-for="(c, i) in displayMessage"
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

                    <gas-fee-bar
                        :fee="displayFee"
                        :maxFee="displayMaxFee"
                        :isDelegation="isDappDelegation"
                        :feeToken="feeToken"
                        :caption="feeCaption"
                    >
                        <div class="row no-wrap items-center q-gutter-x-sm">
                            <q-btn-dropdown
                                v-if="showGenericFeeOptions"
                                class="fee-token-btn"
                                toggle-aria-label="Fee token"
                                size="sm"
                                color="secondary"
                                outline
                                rounded
                                no-caps
                                dropdown-icon="expand_more"
                                menu-anchor="bottom right"
                                menu-self="top right"
                                :menu-offset="[0, 8]"
                                :loading="$asyncComputed.genericDelegatorEstimates.updating && isGenericFeeMode"
                                v-model="feeTokenMenuOpen"
                            >
                                <template #label>
                                    <div class="fee-token-btn-content">
                                        <token-avatar
                                            v-if="feeToken"
                                            :spec="feeToken"
                                            size="20px"
                                        />
                                        <q-icon
                                            v-else
                                            name="local_gas_station"
                                            size="20px"
                                        />
                                        <span>{{feeModeLabel}}</span>
                                    </div>
                                </template>
                                <q-card class="fee-token-menu">
                                    <div class="fee-token-menu-header">
                                        {{$t('sign.label_fee_token')}}
                                    </div>
                                    <q-list separator>
                                        <q-item
                                            class="fee-token-option"
                                            clickable
                                            v-close-popup
                                            :active="feeMode === standardFeeMode"
                                            @click="selectFeeMode(standardFeeMode)"
                                        >
                                            <q-item-section
                                                avatar
                                                class="fee-token-option-avatar"
                                            >
                                                <token-avatar
                                                    v-if="vthoToken"
                                                    :spec="vthoToken"
                                                    size="sm"
                                                />
                                            </q-item-section>
                                            <q-item-section class="fee-token-option-body">
                                                <div class="fee-token-option-line">
                                                    <q-item-label class="fee-token-option-title">VTHO</q-item-label>
                                                </div>
                                                <q-item-label
                                                    caption
                                                    class="fee-token-option-status"
                                                >
                                                    <template v-if="fee">
                                                        <amount-label
                                                            :value="fee"
                                                            :decimals="18"
                                                        />
                                                        {{$t('sign.label_fee_token_standard')}}
                                                    </template>
                                                    <q-spinner-dots
                                                        v-else
                                                        color="primary"
                                                    />
                                                </q-item-label>
                                            </q-item-section>
                                            <q-item-section
                                                side
                                                class="fee-token-option-check"
                                            >
                                                <q-icon
                                                    v-if="feeMode === standardFeeMode"
                                                    name="check"
                                                    color="primary"
                                                    size="18px"
                                                />
                                            </q-item-section>
                                        </q-item>
                                        <q-item
                                            v-for="option in genericFeeOptions"
                                            :key="option.token"
                                            class="fee-token-option"
                                            clickable
                                            v-close-popup
                                            :active="feeMode === option.mode"
                                            @click="selectFeeMode(option.mode)"
                                        >
                                            <q-item-section
                                                avatar
                                                class="fee-token-option-avatar"
                                            >
                                                <token-avatar
                                                    :spec="option.tokenSpec"
                                                    size="sm"
                                                />
                                            </q-item-section>
                                            <q-item-section class="fee-token-option-body">
                                                <div class="fee-token-option-line">
                                                    <q-item-label class="fee-token-option-title">{{option.token}}</q-item-label>
                                                </div>
                                                <q-item-label
                                                    caption
                                                    :class="[
                                                        'fee-token-option-status',
                                                        { 'text-negative': option.balanceLow }
                                                    ]"
                                                >
                                                    <template v-if="option.estimate">
                                                        <amount-label
                                                            :value="option.estimate.amountWei"
                                                            :decimals="option.tokenSpec.decimals"
                                                        />
                                                        {{option.token}} · {{option.status}}
                                                    </template>
                                                    <q-spinner-dots
                                                        v-else-if="$asyncComputed.genericDelegatorEstimates.updating"
                                                        color="primary"
                                                    />
                                                    <template v-else>
                                                        {{option.status}}
                                                    </template>
                                                </q-item-label>
                                            </q-item-section>
                                            <q-item-section
                                                side
                                                class="fee-token-option-check"
                                            >
                                                <q-icon
                                                    v-if="feeMode === option.mode"
                                                    name="check"
                                                    color="primary"
                                                    size="18px"
                                                />
                                            </q-item-section>
                                        </q-item>
                                    </q-list>
                                </q-card>
                            </q-btn-dropdown>
                            <priority-selector
                                v-model="feePriority"
                                :calcFee="calcFee"
                            />
                        </div>
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
                    :disable="signActionDisabled"
                />
            </page-action>
        </q-card>
    </q-dialog>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
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
import TokenAvatar from 'src/components/TokenAvatar.vue'
import AmountLabel from 'src/components/AmountLabel.vue'
import { Transaction } from 'thor-devkit'
import { BigNumber } from 'bignumber.js'
import { randomBytes } from 'crypto'
import ErrorTip from './ErrorTip.vue'
import WarningListDialog from './WarningListDialog.vue'
import InspectClauseDialog from './InspectClauseDialog.vue'
import { dialogErrorMessage } from 'src/utils/dialog-error'
import {
    FeePriority,
    buildDynamicFeeTxBody,
    calcCurrentFee,
    calcMaxFee,
    calcMaxFeePerGas,
    calcPriorityFeePerGas
} from './fee-market'
import {
    GENERIC_GAS_TOKENS,
    GenericDelegatorEstimate,
    GenericDelegatorEstimateMap,
    GenericFeeMode,
    GenericGasToken,
    GenericGasTokenBalanceMap,
    STANDARD_FEE_MODE,
    buildGenericDelegatorPaymentClause,
    calcGenericGasTokenRequiredBalance,
    genericDelegatorDepositUrl,
    genericDelegatorEstimateUrl,
    genericDelegatorSignUrl,
    genericFeeModeFor,
    genericGasTokenFromFeeMode,
    getGenericDelegatorUrl,
    getGenericGasTokenSpec,
    parseGenericDelegatorDepositAccount,
    parseGenericDelegatorEstimate,
    parseGenericDelegatorSignature,
    shouldShowGenericFeeOptions,
    speedFromFeePriority
} from './generic-delegator'

type GenericFeeOption = {
    token: GenericGasToken
    mode: GenericFeeMode
    tokenSpec: M.TokenSpec
    estimate: GenericDelegatorEstimate | null
    status: string
    balanceLow: boolean
}

type AsyncComputedState = {
    $asyncComputed: {
        delayedEstimation: {
            exception?: Error
        },
        genericDelegatorEstimates: {
            updating: boolean
            exception?: Error
        },
        genericDelegatorDepositAccount: {
            updating: boolean
            exception?: Error
        }
    }
}

type TxDialogState = Vue & {
    feePriority: number
    feeMode: GenericFeeMode
    feeTokenMenuOpen: boolean
}

export default defineComponent({
    extends: Common,
    emits: ['hide', 'ok'],
    components: { PageToolbar, PageContent, PageAction, SignerSelector, PrioritySelector, GasFeeBar, ClauseCard, ErrorTip, TokenAvatar, AmountLabel },
    props: {
        req: Object as () => M.TxRequest
    },
    data(): { feePriority: number; feeMode: GenericFeeMode; feeTokenMenuOpen: boolean } {
        return {
            feePriority: FeePriority.Regular,
            feeMode: STANDARD_FEE_MODE,
            feeTokenMenuOpen: false
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
            const vm = this as unknown as TxDialogState
            return est ? calcPriorityFeePerGas(est.feeMarket.priorityFee, vm.feePriority) : null
        },
        maxFeePerGas(): BigNumber | null {
            const est = this.estimation
            const priorityFeePerGas = this.priorityFeePerGas
            return est && priorityFeePerGas ? calcMaxFeePerGas(est.feeMarket.baseFeePerGas, priorityFeePerGas) : null
        },
        fee(): string | null {
            const vm = this as unknown as TxDialogState
            return this.calcFee ? this.calcFee(vm.feePriority) : null
        },
        maxFee(): string | null {
            const est = this.estimation
            const maxFeePerGas = this.maxFeePerGas
            return est && maxFeePerGas ? calcMaxFee(est.gas, maxFeePerGas).toString() : null
        },
        standardFeeMode(): GenericFeeMode {
            return STANDARD_FEE_MODE
        },
        genericDelegatorUrl(): string | null {
            return getGenericDelegatorUrl(this.gid)
        },
        showGenericFeeOptions(): boolean {
            return shouldShowGenericFeeOptions(this.gid, this.isDappDelegation)
        },
        selectedGenericGasToken(): GenericGasToken | null {
            const vm = this as unknown as TxDialogState
            return genericGasTokenFromFeeMode(vm.feeMode)
        },
        isGenericFeeMode(): boolean {
            return !!this.selectedGenericGasToken
        },
        genericFeeSpeed() {
            const vm = this as unknown as TxDialogState
            return speedFromFeePriority(vm.feePriority)
        },
        genericDelegatorEstimate(): GenericDelegatorEstimate | null {
            const token = this.selectedGenericGasToken
            return token ? (this.genericDelegatorEstimates[token] || null) : null
        },
        selectedGenericTokenSpec(): M.TokenSpec | null {
            const token = this.selectedGenericGasToken
            return token ? getGenericGasTokenSpec(this.gid, this.tokens, token) : null
        },
        genericDelegatorPaymentClause(): Connex.Vendor.TxMessage[0] | null {
            const token = this.selectedGenericGasToken
            const tokenSpec = this.selectedGenericTokenSpec
            const estimate = this.genericDelegatorEstimate
            const depositAccount = this.genericDelegatorDepositAccount
            if (!token || !tokenSpec || !estimate || !depositAccount) {
                return null
            }
            return buildGenericDelegatorPaymentClause(token, tokenSpec, depositAccount, estimate.amountWei)
        },
        displayMessage(): Connex.Vendor.TxMessage {
            const paymentClause = this.genericDelegatorPaymentClause
            return paymentClause ? [...this.req.message, paymentClause] : this.req.message
        },
        vthoToken(): M.TokenSpec | null {
            return getGenericGasTokenSpec(this.gid, this.tokens, 'VTHO')
        },
        feeToken(): M.TokenSpec | null {
            return this.selectedGenericTokenSpec || this.vthoToken
        },
        displayFee(): string | null {
            if (this.isGenericFeeMode) {
                return this.genericDelegatorEstimate ? this.genericDelegatorEstimate.amountWei : null
            }
            return this.fee
        },
        displayMaxFee(): string | null {
            return this.isGenericFeeMode ? null : this.maxFee
        },
        feeCaption(): string {
            return this.isGenericFeeMode ? this.$t('sign.msg_generic_delegation').toString() : ''
        },
        feeModeLabel(): string {
            return this.selectedGenericGasToken || 'VTHO'
        },
        genericFeeWarning(): Error | null {
            const token = this.selectedGenericGasToken
            const tokenSpec = this.selectedGenericTokenSpec
            const estimate = this.genericDelegatorEstimate
            if (!token || !tokenSpec || !estimate) {
                return null
            }
            const balance = this.genericGasTokenBalances[token]
            if (!balance) {
                return null
            }
            const required = calcGenericGasTokenRequiredBalance(this.req.message, token, tokenSpec, estimate.amountWei)
            if (new BigNumber(balance).isLessThan(required)) {
                return {
                    name: this.$t('sign.label_insufficient_fee_token').toString(),
                    message: this.$t('sign.msg_insufficient_fee_token', { token }).toString()
                }
            }
            return null
        },
        genericFeeBalanceLow(): boolean {
            return !!this.genericFeeWarning
        },
        genericFeeOptions(): GenericFeeOption[] {
            return GENERIC_GAS_TOKENS.reduce((items: GenericFeeOption[], token) => {
                const tokenSpec = getGenericGasTokenSpec(this.gid, this.tokens, token)
                if (!tokenSpec) {
                    return items
                }
                const estimate = this.genericDelegatorEstimates[token] || null
                const balance = this.genericGasTokenBalances[token]
                let status = this.$t('sign.msg_generic_fee_unavailable').toString()
                let balanceLow = false
                if (estimate && balance) {
                    const required = calcGenericGasTokenRequiredBalance(this.req.message, token, tokenSpec, estimate.amountWei)
                    balanceLow = new BigNumber(balance).isLessThan(required)
                    status = balanceLow
                        ? this.$t('sign.msg_generic_fee_balance_low').toString()
                        : this.$t('sign.msg_generic_fee_balance_ok').toString()
                } else if (estimate) {
                    status = this.$t('sign.msg_generic_delegation').toString()
                }
                items.push({
                    token,
                    mode: genericFeeModeFor(token),
                    tokenSpec,
                    estimate,
                    status,
                    balanceLow
                })
                return items
            }, [])
        },
        signActionDisabled(): boolean {
            return this.isGenericFeeMode && (
                !this.genericDelegatorEstimate ||
                !this.genericDelegatorDepositAccount ||
                !this.selectedGenericTokenSpec ||
                this.genericFeeBalanceLow
            )
        },
        criticalError(): Error | null {
            if (!this.wallet) {
                return { name: this.$t('sign.label_critical_error').toString(), message: this.signerGroups.length > 0 ? this.$t('sign.msg_address_not_owned').toString() : this.$t('common.no_wallet').toString() }
            }
            // test vip191 feature bit when delegator set
            const head = this.thor.status.head
            if (head.number > 0 && this.isDelegation && !((head.txsFeatures || 0) & 1)) {
                return { name: this.$t('sign.label_critical_error').toString(), message: this.$t('sign.msg_vip191_not_supported').toString() }
            }
            const vm = this as unknown as AsyncComputedState
            const estimationException = vm.$asyncComputed.delayedEstimation.exception
            if (head.number > 0 && estimationException) {
                return { name: this.$t('sign.label_critical_error').toString(), message: estimationException.message }
            }
            if (this.isGenericFeeMode && !vm.$asyncComputed.genericDelegatorEstimates.updating && !this.genericDelegatorEstimate) {
                return { name: this.$t('sign.label_critical_error').toString(), message: this.$t('sign.msg_generic_fee_unavailable').toString() }
            }
            const depositException = vm.$asyncComputed.genericDelegatorDepositAccount.exception
            if (this.isGenericFeeMode && head.number > 0 && depositException) {
                return { name: this.$t('sign.label_critical_error').toString(), message: depositException.message }
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
            this.genericFeeWarning && ret.push(this.genericFeeWarning)
            return ret
        },
        isDelegation(): boolean {
            return this.isDappDelegation || this.isGenericFeeMode
        },
        isDappDelegation(): boolean {
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
                this.displayMessage,
                this.isGenericFeeMode ? (this.genericDelegatorEstimate ? this.genericDelegatorEstimate.gas : 0) : (this.req.options.gas || 0),
                this.signer,
                this.req.options.delegator && this.req.options.delegator.signer,
                !this.isGenericFeeMode)
        },
        tokens: {
            async get(): Promise<M.TokenSpec[]> {
                const all = await this.$svc.config.token.all()
                return all.filter(spec => spec.gid === this.gid)
            },
            default: () => []
        },
        genericDelegatorDepositAccount: {
            async get(): Promise<string> {
                const url = this.genericDelegatorUrl
                if (!this.showGenericFeeOptions || !url) {
                    return ''
                }
                const resp = await this.$axios.get(genericDelegatorDepositUrl(url))
                return parseGenericDelegatorDepositAccount(resp.data)
            },
            default: ''
        },
        genericDelegatorEstimates: {
            async get(): Promise<GenericDelegatorEstimateMap> {
                const url = this.genericDelegatorUrl
                if (!this.showGenericFeeOptions || !url || !this.signer) {
                    return {}
                }
                const entries = await Promise.all(GENERIC_GAS_TOKENS.map(async token => {
                    try {
                        const resp = await this.$axios.post(
                            genericDelegatorEstimateUrl(url, token, this.genericFeeSpeed),
                            {
                                clauses: this.req.message,
                                signer: this.signer
                            },
                            { headers: { 'content-type': 'application/json' } }
                        )
                        return parseGenericDelegatorEstimate(resp.data, token, this.genericFeeSpeed)
                    } catch (err) {
                        console.warn(`Generic Delegator ${token} estimate failed`, err)
                        return null
                    }
                }))
                return entries.reduce((result: GenericDelegatorEstimateMap, entry) => {
                    if (entry) {
                        result[entry.token] = entry
                    }
                    return result
                }, {})
            },
            default: () => ({})
        },
        genericGasTokenBalances: {
            async get(): Promise<GenericGasTokenBalanceMap> {
                if (!this.showGenericFeeOptions || !this.signer) {
                    return {}
                }
                const entries = await Promise.all(GENERIC_GAS_TOKENS.map(async token => {
                    const tokenSpec = getGenericGasTokenSpec(this.gid, this.tokens, token)
                    if (!tokenSpec) {
                        return null
                    }
                    return {
                        token,
                        balance: await this.$svc.bc(this.gid).balanceOf(this.signer, tokenSpec)
                    }
                }))
                return entries.reduce((result: GenericGasTokenBalanceMap, entry) => {
                    if (entry) {
                        result[entry.token] = entry.balance
                    }
                    return result
                }, {})
            },
            default: () => ({})
        },
        async energyWarning(): Promise<Error | null> {
            const est = this.estimation
            const fee = this.maxFee
            if (this.isGenericFeeMode || !est || !fee || (this.req.options.delegator && !this.req.options.delegator.signer)) {
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
    watch: {
        showGenericFeeOptions(show: boolean) {
            if (!show) {
                const vm = this as unknown as TxDialogState
                vm.feeMode = STANDARD_FEE_MODE
            }
        }
    },
    methods: {
        // method is REQUIRED by $q.dialog
        show() { (this.$refs.dialog as QDialog).show() },
        // method is REQUIRED by $q.dialog
        hide() { (this.$refs.dialog as QDialog).hide() },

        ok(result: M.TxResponse) {
            this.rememberSigner()
            this.$emit('ok', result)
            this.hide()
        },
        showWarnings() {
            this.$q.dialog({
                component: WarningListDialog,
                componentProps: {
                    warnings: this.warnings,
                    noAction: true
                }
            })
        },
        selectFeeMode(mode: GenericFeeMode) {
            const vm = this as unknown as TxDialogState
            vm.feeMode = mode
        },
        async onClickSign() {
            try {
                await this.sign()
            } catch (err) {
                const message = dialogErrorMessage(err, this.$t('common.something_wrong').toString())
                if (message) {
                    this.$q.notify({ type: 'negative', message })
                }
            }
        },
        async sign() {
            const est = this.estimation
            const wallet = this.wallet
            const signer = this.signer
            const priorityFeePerGas = this.priorityFeePerGas
            const maxFeePerGas = this.maxFeePerGas
            const genericToken = this.selectedGenericGasToken
            const genericEstimate = this.genericDelegatorEstimate
            const genericUrl = this.genericDelegatorUrl

            if (!est || !wallet || !priorityFeePerGas || !maxFeePerGas) {
                return
            }
            if (genericToken && (!genericEstimate || !genericUrl || !this.genericDelegatorPaymentClause)) {
                this.$q.notify({
                    type: 'negative',
                    message: this.$t('sign.msg_generic_fee_unavailable').toString()
                })
                return
            }
            if (genericToken && this.genericFeeWarning) {
                this.$q.notify({
                    type: 'negative',
                    message: this.genericFeeWarning.message
                })
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
                    this.displayMessage,
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
                        } catch {
                            throw new Error(this.$t('sign.msg_delegation_failed').toString())
                        }
                    } else if (genericToken) {
                        tx = new Transaction({ ...txBody, reserved: { features: Transaction.DELEGATED_MASK } })
                    } else {
                        tx = new Transaction(txBody)
                    }
                    return tx
                })
            })

            if (genericToken && genericUrl) {
                tx.signature = originSig
                try {
                    delegatorSig = await this.$loading(async () => {
                        const resp = await this.$axios.post(
                            genericDelegatorSignUrl(genericUrl, genericToken),
                            {
                                raw: '0x' + tx.encode().toString('hex'),
                                origin: signer,
                                token: genericToken.toLowerCase()
                            },
                            { headers: { 'content-type': 'application/json' } }
                        )
                        return parseGenericDelegatorSignature(resp.data)
                    })
                } catch {
                    throw new Error(this.$t('sign.msg_generic_delegation_failed').toString())
                }
            }

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
                component: InspectClauseDialog,
                componentProps: {
                    index,
                    clause,
                    gid: this.gid
                }
            })
        }
    }
})
</script>
<style scoped>
.fee-token-btn {
    min-width: 104px;
}

.fee-token-btn-content {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
}

.fee-token-menu {
    width: min(304px, calc(100vw - 24px));
    border-radius: 6px;
}

.fee-token-menu-header {
    padding: 12px 14px 8px;
    color: var(--q-primary);
    font-size: 0.78rem;
    font-weight: 700;
    line-height: 1.2;
    text-transform: uppercase;
}

.fee-token-option {
    min-height: 60px;
    padding: 8px 10px 8px 12px;
    border-left: 3px solid transparent;
}

.fee-token-option.q-item--active {
    border-left-color: var(--q-primary);
    background: rgba(25, 118, 210, 0.08);
    color: inherit;
}

.fee-token-option-avatar {
    min-width: 44px;
    padding-right: 10px;
}

.fee-token-option-body {
    min-width: 0;
}

.fee-token-option-line {
    display: flex;
    align-items: baseline;
}

.fee-token-option-title {
    overflow: hidden;
    color: #111;
    font-size: 0.98rem;
    font-weight: 700;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.fee-token-option-status {
    margin-top: 2px;
    overflow: hidden;
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.fee-token-option-check {
    min-width: 30px;
    padding-left: 10px;
    padding-right: 8px;
}
</style>
