<template>
    <div class="column fit no-wrap swap-page">
        <page-toolbar
            :title="$t('swap.title')"
            :gid="selectedWallet && selectedWallet.gid"
        />
        <page-content
            padding
            class="col"
            innerClass="q-gutter-md"
        >
            <q-banner
                v-if="!wallets.length"
                class="bg-grey-3 text-grey-8"
            >
                {{$t('common.no_wallet')}}
            </q-banner>
            <q-banner
                v-else-if="selectedWallet && !supported"
                class="bg-orange-1 text-deep-orange"
            >
                {{$t('swap.msg_mainnet_only')}}
            </q-banner>

            <section class="swap-panel">
                <div class="row items-center justify-between q-mb-sm">
                    <div class="text-subtitle2 text-uppercase text-grey-7">{{$t('swap.label_from')}}</div>
                    <q-btn
                        v-if="fromToken"
                        dense
                        flat
                        color="primary"
                        :label="$t('swap.action_max')"
                        @click="setMaxAmount"
                    />
                </div>
                <div class="row q-col-gutter-sm items-start">
                    <div class="col">
                        <q-input
                            dense
                            outlined
                            no-error-icon
                            autocomplete="off"
                            type="text"
                            inputmode="decimal"
                            placeholder="0"
                            v-model="amount"
                            :disable="!supported"
                            :error="!!amountError"
                            :error-message="amountError"
                            @input="onAmountChanged"
                        />
                    </div>
                    <div class="col-5">
                        <q-select
                            dense
                            outlined
                            emit-value
                            map-options
                            :disable="!supported || tokenOptions.length === 0"
                            v-model="fromSymbol"
                            :options="tokenOptions"
                            @input="onFromTokenChanged"
                        >
                            <template v-slot:prepend>
                                <token-avatar
                                    v-if="fromToken"
                                    size="sm"
                                    :spec="fromToken"
                                />
                            </template>
                        </q-select>
                    </div>
                </div>
                <div
                    v-if="fromToken"
                    class="swap-balance text-caption text-grey-7"
                >
                    {{$t('swap.label_balance')}}:
                    <amount-label
                        :value="fromBalance"
                        :decimals="fromToken.decimals"
                        :fixed="4"
                    >--</amount-label>
                    {{fromToken.symbol}}
                </div>
            </section>

            <div class="text-center">
                <q-btn
                    round
                    outline
                    color="primary"
                    icon="swap_vert"
                    :disable="!supported || tokenOptions.length < 2"
                    @click="swapTokens"
                />
            </div>

            <section class="swap-panel">
                <div class="text-subtitle2 text-uppercase text-grey-7 q-mb-sm">{{$t('swap.label_to')}}</div>
                <div class="row q-col-gutter-sm items-start">
                    <div class="col">
                        <div class="swap-output text-h5 ellipsis">
                            <amount-label
                                v-if="toToken"
                                :value="outputAmount"
                                :decimals="toToken.decimals"
                                :fixed="6"
                            >0</amount-label>
                            <span v-else>0</span>
                        </div>
                    </div>
                    <div class="col-5">
                        <q-select
                            dense
                            outlined
                            emit-value
                            map-options
                            :disable="!supported || tokenOptions.length === 0"
                            v-model="toSymbol"
                            :options="tokenOptions"
                            @input="onToTokenChanged"
                        >
                            <template v-slot:prepend>
                                <token-avatar
                                    v-if="toToken"
                                    size="sm"
                                    :spec="toToken"
                                />
                            </template>
                        </q-select>
                    </div>
                </div>
                <div
                    v-if="toToken"
                    class="swap-balance text-caption text-grey-7"
                >
                    {{$t('swap.label_balance')}}:
                    <amount-label
                        :value="toBalance"
                        :decimals="toToken.decimals"
                        :fixed="4"
                    >--</amount-label>
                    {{toToken.symbol}}
                </div>
            </section>

            <section class="swap-panel">
                <div class="row items-center justify-between q-mb-sm">
                    <div class="text-subtitle2 text-uppercase text-grey-7">{{$t('swap.label_source')}}</div>
                    <q-spinner
                        v-if="quoteLoading"
                        color="primary"
                    />
                </div>
                <q-select
                    dense
                    outlined
                    emit-value
                    map-options
                    :disable="quoteLoading || quoteOptions.length === 0"
                    v-model="selectedAggregatorName"
                    :options="quoteOptions"
                />
                <q-list
                    v-if="selectedQuote"
                    dense
                    class="swap-details q-mt-sm"
                >
                    <q-item>
                        <q-item-section>{{$t('swap.label_min_received')}}</q-item-section>
                        <q-item-section side>
                            <span v-if="toToken">
                                <amount-label
                                    :value="selectedQuote.minimumOutputAmount"
                                    :decimals="toToken.decimals"
                                    :fixed="6"
                                /> {{toToken.symbol}}
                            </span>
                        </q-item-section>
                    </q-item>
                    <q-item>
                        <q-item-section>{{$t('swap.label_fee')}}</q-item-section>
                        <q-item-section side>{{feeText}}</q-item-section>
                    </q-item>
                </q-list>
            </section>

            <section class="swap-panel">
                <div class="row items-center justify-between q-mb-sm">
                    <div class="text-subtitle2 text-uppercase text-grey-7">{{$t('swap.label_slippage')}}</div>
                    <div class="text-caption text-grey-7">{{slippageTolerance}}%</div>
                </div>
                <div class="row q-col-gutter-sm">
                    <div class="col-4">
                        <q-btn
                            class="full-width"
                            :outline="slippageTolerance !== 1"
                            color="primary"
                            label="Auto"
                            @click="setSlippage(1)"
                        />
                    </div>
                    <div class="col-4">
                        <q-btn
                            class="full-width"
                            :outline="slippageTolerance !== 0.5"
                            color="primary"
                            label="0.5%"
                            @click="setSlippage(0.5)"
                        />
                    </div>
                    <div class="col-4">
                        <q-btn
                            class="full-width"
                            :outline="slippageTolerance !== 3"
                            color="primary"
                            label="3%"
                            @click="setSlippage(3)"
                        />
                    </div>
                    <div class="col-12">
                        <q-input
                            dense
                            outlined
                            suffix="%"
                            inputmode="decimal"
                            :label="$t('swap.label_custom_slippage')"
                            v-model="customSlippage"
                            @input="onCustomSlippageChanged"
                        />
                    </div>
                </div>
            </section>

            <q-banner
                v-if="statusText"
                :class="statusClass"
            >
                {{statusText}}
            </q-banner>
        </page-content>

        <div class="swap-wallet-panel q-pa-sm">
            <div class="narrow-page q-mx-auto q-gutter-sm">
                <q-select
                    dense
                    outlined
                    emit-value
                    map-options
                    v-model="selectedWalletId"
                    :options="walletOptions"
                    :label="$t('swap.label_wallet')"
                    @input="onWalletChanged"
                />
                <q-select
                    dense
                    outlined
                    emit-value
                    map-options
                    :disable="!selectedWallet"
                    v-model="selectedAddress"
                    :options="addressOptions"
                    :label="$t('swap.label_address')"
                    @input="onAddressChanged"
                />
                <address-label
                    v-if="selectedAddress && selectedWallet"
                    :addr="selectedAddress"
                    :gid="selectedWallet.gid"
                    full
                />
            </div>
        </div>

        <page-action>
            <q-btn
                unelevated
                color="primary"
                :disable="!canSwap"
                :loading="swapping"
                :label="$t('swap.action_swap')"
                @click="onSwap"
            />
        </page-action>
    </div>
</template>
<script lang="ts">
import Vue from 'vue'
import { BigNumber } from 'bignumber.js'
import AddressLabel from 'src/components/AddressLabel.vue'
import AmountLabel from 'src/components/AmountLabel.vue'
import PageAction from 'src/components/PageAction.vue'
import PageContent from 'src/components/PageContent.vue'
import PageToolbar from 'src/components/PageToolbar.vue'
import TokenAvatar from 'src/components/TokenAvatar.vue'
import { toWei } from 'src/utils/format'
import {
    BuiltSwapQuote,
    SwapParams,
    buildSwapSigners,
    getSwapAggregators,
    getSwapQuotes,
    normalizeSwapTokenAddress,
    selectBestQuote,
    swapNetworkOf
} from 'src/utils/swap'
import {
    VetDomainAddressOption,
    VetDomainWalletOption,
    buildVetDomainAddressOptions,
    buildVetDomainWalletOptions,
    findVetDomainWallet,
    resolveVetDomainAddress
} from 'src/utils/vet-domain-wallet-selection'

const SELECTED_WALLET_ID_KEY = 'selectedWalletId'
const QUOTE_DELAY = 650

type SelectOption<T> = {
    label: string
    value: T
    disable?: boolean
}

type SwapData = {
    wallets: M.Wallet[]
    tokens: M.TokenSpec[]
    balances: Record<string, string>
    amount: string
    fromSymbol: string
    toSymbol: string
    selectedWalletId: number
    selectedAddress: string
    slippageTolerance: number
    customSlippage: string
    quoteLoading: boolean
    swapping: boolean
    quotes: BuiltSwapQuote[]
    selectedAggregatorName: string
    statusText: string
    statusClass: string
    quoteTimer: number
    quoteRequestKey: string
}

function shortRawAmount(raw: string, decimals: number): string {
    const value = new BigNumber(raw || 0).div(`1${'0'.repeat(decimals)}`)
    if (!value.isFinite()) {
        return '0'
    }
    return value.toFixed(decimals).replace(/\.?0+$/, '')
}

function amountHasValidShape(amount: string, decimals: number): boolean {
    if (!/^\d*\.?\d*$/.test(amount) || amount === '' || amount === '.') {
        return false
    }
    const parts = amount.split('.')
    return !parts[1] || parts[1].length <= decimals
}

export default Vue.extend({
    components: {
        AddressLabel,
        AmountLabel,
        PageAction,
        PageContent,
        PageToolbar,
        TokenAvatar
    },
    data(): SwapData {
        return {
            wallets: [],
            tokens: [],
            balances: {},
            amount: '',
            fromSymbol: 'VET',
            toSymbol: '',
            selectedWalletId: parseInt(localStorage.getItem(SELECTED_WALLET_ID_KEY) || '0', 10),
            selectedAddress: '',
            slippageTolerance: 1,
            customSlippage: '1',
            quoteLoading: false,
            swapping: false,
            quotes: [],
            selectedAggregatorName: '',
            statusText: '',
            statusClass: '',
            quoteTimer: 0,
            quoteRequestKey: ''
        }
    },
    computed: {
        walletOptions(): VetDomainWalletOption[] {
            return buildVetDomainWalletOptions(this.wallets)
        },
        addressOptions(): VetDomainAddressOption[] {
            return buildVetDomainAddressOptions(this.selectedWallet)
        },
        selectedWallet(): M.Wallet | null {
            return findVetDomainWallet(this.wallets, this.selectedWalletId)
        },
        supported(): boolean {
            return !!this.selectedWallet && swapNetworkOf(this.selectedWallet.gid) === 'main'
        },
        tokenOptions(): SelectOption<string>[] {
            return this.tokens.map(token => {
                return {
                    label: `${token.symbol} - ${token.name}`,
                    value: token.symbol
                }
            })
        },
        fromToken(): M.TokenSpec | null {
            return this.tokens.find(token => token.symbol === this.fromSymbol) || null
        },
        toToken(): M.TokenSpec | null {
            return this.tokens.find(token => token.symbol === this.toSymbol) || null
        },
        fromBalance(): string {
            return this.balances[this.fromSymbol] || '0'
        },
        toBalance(): string {
            return this.balances[this.toSymbol] || '0'
        },
        amountError(): string {
            if (!this.amount || !this.fromToken) {
                return ''
            }
            if (!amountHasValidShape(this.amount, this.fromToken.decimals)) {
                return this.$t('swap.msg_invalid_amount').toString()
            }
            const raw = toWei(this.amount, this.fromToken.decimals)
            if (!new BigNumber(raw).isGreaterThan(0)) {
                return this.$t('swap.msg_invalid_amount').toString()
            }
            if (new BigNumber(raw).isGreaterThan(this.fromBalance)) {
                return this.$t('swap.msg_insufficient_balance').toString()
            }
            return ''
        },
        selectedQuote(): BuiltSwapQuote | null {
            return this.quotes.find(quote => quote.aggregatorName === this.selectedAggregatorName) || selectBestQuote(this.quotes)
        },
        outputAmount(): string {
            return this.selectedQuote ? this.selectedQuote.outputAmount : '0'
        },
        quoteOptions(): SelectOption<string>[] {
            return this.quotes.map(quote => {
                const output = this.toToken ? shortRawAmount(quote.outputAmount, this.toToken.decimals) : quote.outputAmount
                const suffix = quote.reverted ? ` - ${this.$t('swap.label_unavailable')}` : ` - ${output} ${this.toToken ? this.toToken.symbol : ''}`
                return {
                    label: `${quote.aggregatorName}${suffix}`,
                    value: quote.aggregatorName,
                    disable: quote.reverted
                }
            })
        },
        feeText(): string {
            return this.selectedQuote && this.selectedQuote.gasCostVTHO > 0
                ? `${this.selectedQuote.gasCostVTHO.toFixed(2)} VTHO`
                : '-'
        },
        canQuote(): boolean {
            return !!this.selectedWallet &&
                this.supported &&
                !!this.selectedAddress &&
                !!this.fromToken &&
                !!this.toToken &&
                this.fromSymbol !== this.toSymbol &&
                !!this.amount &&
                !this.amountError
        },
        canSwap(): boolean {
            return this.canQuote &&
                !!this.selectedQuote &&
                !this.selectedQuote.reverted &&
                !this.quoteLoading &&
                !this.swapping
        }
    },
    async mounted() {
        this.wallets = await this.$svc.wallet.all()
        this.ensureSelectedWallet()
        this.ensureSelectedAddress()
        await this.loadTokens()
        await this.loadBalances()
        this.scheduleQuote()
    },
    beforeDestroy() {
        window.clearTimeout(this.quoteTimer)
    },
    methods: {
        ensureSelectedWallet() {
            if (this.walletOptions.length > 0 && !this.walletOptions.find(option => option.value === this.selectedWalletId)) {
                this.selectedWalletId = this.walletOptions[0].value
                localStorage.setItem(SELECTED_WALLET_ID_KEY, this.selectedWalletId.toString())
            }
        },
        ensureSelectedAddress() {
            this.selectedAddress = resolveVetDomainAddress(this.selectedWallet, this.selectedAddress)
        },
        ensureSelectedTokens() {
            if (this.tokens.length === 0) {
                this.fromSymbol = ''
                this.toSymbol = ''
                return
            }
            if (!this.tokens.find(token => token.symbol === this.fromSymbol)) {
                this.fromSymbol = (this.tokens.find(token => token.symbol === 'VET') || this.tokens[0]).symbol
            }
            if (!this.tokens.find(token => token.symbol === this.toSymbol) || this.toSymbol === this.fromSymbol) {
                const b3tr = this.tokens.find(token => token.symbol === 'B3TR' && token.symbol !== this.fromSymbol)
                const fallback = this.tokens.find(token => token.symbol !== this.fromSymbol)
                this.toSymbol = (b3tr || fallback || this.tokens[0]).symbol
            }
        },
        async loadTokens() {
            const wallet = this.selectedWallet
            if (!wallet) {
                this.tokens = []
                return
            }
            const [tokens, activeSymbols] = await Promise.all([
                this.$svc.config.token.all(),
                this.$svc.config.token.activeSymbols()
            ])
            this.tokens = tokens.filter(token => {
                return token.gid === wallet.gid && (token.permanent || activeSymbols.includes(token.symbol))
            })
            this.ensureSelectedTokens()
        },
        async loadBalances() {
            const wallet = this.selectedWallet
            if (!wallet || !this.selectedAddress) {
                this.balances = {}
                return
            }
            const entries = await Promise.all(this.tokens.map(async token => {
                try {
                    return {
                        symbol: token.symbol,
                        balance: await this.$svc.bc(wallet.gid).balanceOf(this.selectedAddress, token)
                    }
                } catch {
                    return {
                        symbol: token.symbol,
                        balance: '0'
                    }
                }
            }))
            const balances: Record<string, string> = {}
            entries.forEach(entry => {
                balances[entry.symbol] = entry.balance
            })
            this.balances = balances
        },
        async onWalletChanged() {
            localStorage.setItem(SELECTED_WALLET_ID_KEY, this.selectedWalletId.toString())
            this.selectedAddress = ''
            this.ensureSelectedAddress()
            await this.loadTokens()
            await this.loadBalances()
            this.scheduleQuote()
        },
        async onAddressChanged() {
            this.ensureSelectedAddress()
            await this.loadBalances()
            this.scheduleQuote()
        },
        onFromTokenChanged() {
            if (this.fromSymbol === this.toSymbol) {
                const next = this.tokens.find(token => token.symbol !== this.fromSymbol)
                this.toSymbol = next ? next.symbol : this.toSymbol
            }
            this.scheduleQuote()
        },
        onToTokenChanged() {
            if (this.fromSymbol === this.toSymbol) {
                const next = this.tokens.find(token => token.symbol !== this.toSymbol)
                this.fromSymbol = next ? next.symbol : this.fromSymbol
            }
            this.scheduleQuote()
        },
        onAmountChanged() {
            if (!/^\d*\.?\d*$/.test(this.amount)) {
                this.amount = this.amount.replace(/[^\d.]/g, '')
            }
            this.scheduleQuote()
        },
        setMaxAmount() {
            if (!this.fromToken) {
                return
            }
            this.amount = shortRawAmount(this.fromBalance, this.fromToken.decimals)
            this.scheduleQuote()
        },
        swapTokens() {
            const previous = this.fromSymbol
            this.fromSymbol = this.toSymbol
            this.toSymbol = previous
            this.scheduleQuote()
        },
        setSlippage(value: number) {
            this.slippageTolerance = value
            this.customSlippage = value.toString()
            this.scheduleQuote()
        },
        onCustomSlippageChanged() {
            if (!/^\d*\.?\d*$/.test(this.customSlippage)) {
                this.customSlippage = this.customSlippage.replace(/[^\d.]/g, '')
            }
            const value = Number(this.customSlippage)
            if (Number.isFinite(value) && value >= 0 && value <= 100) {
                this.slippageTolerance = value
                this.scheduleQuote()
            }
        },
        buildParams(): SwapParams | null {
            if (!this.fromToken || !this.toToken || !this.selectedAddress || this.amountError || !this.amount) {
                return null
            }
            return {
                fromTokenAddress: normalizeSwapTokenAddress(this.fromToken.address),
                toTokenAddress: normalizeSwapTokenAddress(this.toToken.address),
                amountIn: toWei(this.amount, this.fromToken.decimals),
                userAddress: this.selectedAddress,
                slippageTolerance: this.slippageTolerance
            }
        },
        scheduleQuote() {
            window.clearTimeout(this.quoteTimer)
            this.quoteRequestKey = ''
            this.quoteLoading = false
            this.quotes = []
            this.selectedAggregatorName = ''
            this.statusText = ''
            this.statusClass = ''
            if (!this.canQuote) {
                return
            }
            this.quoteTimer = window.setTimeout(() => {
                void this.loadQuotes()
            }, QUOTE_DELAY)
        },
        async loadQuotes() {
            const wallet = this.selectedWallet
            const params = this.buildParams()
            if (!wallet || !params) {
                return
            }
            const requestKey = JSON.stringify({ wallet: wallet.id, params })
            this.quoteRequestKey = requestKey
            this.quoteLoading = true
            try {
                const result = await getSwapQuotes(
                    params,
                    this.$svc.bc(wallet.gid).thor,
                    getSwapAggregators(swapNetworkOf(wallet.gid))
                )
                if (this.quoteRequestKey !== requestKey) {
                    return
                }
                this.quotes = result.quotes
                this.selectedAggregatorName = result.bestQuote ? result.bestQuote.aggregatorName : ''
                if (result.bestQuote) {
                    this.statusText = this.$t('swap.msg_quote_ready').toString()
                    this.statusClass = 'bg-green-1 text-positive'
                } else if (result.quotes.length > 0) {
                    this.statusText = this.$t('swap.msg_routes_unavailable').toString()
                    this.statusClass = 'bg-red-1 text-negative'
                } else {
                    this.statusText = this.$t('swap.msg_no_quote').toString()
                    this.statusClass = 'bg-red-1 text-negative'
                }
            } catch (err) {
                this.statusText = err instanceof Error ? err.message : this.$t('common.something_wrong').toString()
                this.statusClass = 'bg-red-1 text-negative'
            } finally {
                if (this.quoteRequestKey === requestKey) {
                    this.quoteLoading = false
                }
            }
        },
        async onSwap() {
            const wallet = this.selectedWallet
            const quote = this.selectedQuote
            const params = this.buildParams()
            if (!wallet || !quote || !params || !this.fromToken || !this.toToken) {
                return
            }
            this.swapping = true
            try {
                const clauses = await quote.aggregator.buildSwapTransaction(params, quote)
                await this.$signTx(wallet.gid, {
                    message: clauses,
                    options: {
                        comment: this.$t('swap.comment_swap', {
                            fromAmount: this.amount,
                            fromSymbol: this.fromToken.symbol,
                            toSymbol: this.toToken.symbol
                        }).toString()
                    },
                    signers: buildSwapSigners(wallet, this.selectedAddress)
                })
                this.$router.replace({ name: 'sign-success', query: { type: 'tx' } })
            } catch (err) {
                this.statusText = err instanceof Error ? err.message : this.$t('common.something_wrong').toString()
                this.statusClass = 'bg-red-1 text-negative'
            } finally {
                this.swapping = false
            }
        }
    }
})
</script>
<style scoped lang="sass">
.swap-page
  background: #f6f6f3

.swap-panel
  border: 1px solid rgba(0, 0, 0, 0.22)
  border-radius: 0
  background: white
  padding: 14px
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.6) inset

.swap-output
  min-height: 40px
  line-height: 40px

.swap-balance
  margin-top: 8px

.swap-details
  border-top: 1px solid rgba(0, 0, 0, 0.12)

.swap-wallet-panel
  border-top: 1px solid rgba(0, 0, 0, 0.16)
  background: #ffffff
</style>
