<template>
    <div class="column fit no-wrap">
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
                v-else-if="wallets.length && mainWallets.length === 0"
                class="bg-orange-1 text-deep-orange"
            >
                {{$t('swap.msg_mainnet_only')}}
            </q-banner>

            <q-list
                bordered
                separator
            >
                <q-item-label header>{{$t('swap.label_from')}}</q-item-label>
                <q-item>
                    <q-item-section>
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
                    </q-item-section>
                    <q-item-section side>
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
                    </q-item-section>
                </q-item>
                <q-item>
                    <q-item-section class="text-grey-7">
                        <span v-if="fromToken">
                            {{$t('swap.label_balance')}}:
                            <amount-label
                                :value="fromBalance"
                                :decimals="fromToken.decimals"
                                :fixed="4"
                            >--</amount-label>
                            {{fromToken.symbol}}
                        </span>
                    </q-item-section>
                    <q-item-section side>
                        <q-btn
                            v-if="fromToken"
                            dense
                            flat
                            color="primary"
                            :label="$t('swap.action_max')"
                            @click="setMaxAmount"
                        />
                    </q-item-section>
                </q-item>
            </q-list>

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

            <q-list
                bordered
                separator
            >
                <q-item-label header>{{$t('swap.label_to')}}</q-item-label>
                <q-item>
                    <q-item-section>
                        <q-item-label class="text-h5 ellipsis">
                            <amount-label
                                v-if="toToken"
                                :value="outputAmount"
                                :decimals="toToken.decimals"
                                :fixed="6"
                            >0</amount-label>
                            <span v-else>0</span>
                        </q-item-label>
                    </q-item-section>
                    <q-item-section side>
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
                    </q-item-section>
                </q-item>
                <q-item v-if="toToken">
                    <q-item-section class="text-grey-7">
                        {{$t('swap.label_balance')}}:
                        <amount-label
                            :value="toBalance"
                            :decimals="toToken.decimals"
                            :fixed="4"
                        >--</amount-label>
                        {{toToken.symbol}}
                    </q-item-section>
                </q-item>
            </q-list>

            <q-list
                bordered
                separator
            >
                <q-item-label header>{{$t('swap.label_source')}}</q-item-label>
                <q-item>
                    <q-item-section>
                        <q-select
                            dense
                            outlined
                            emit-value
                            map-options
                            :disable="quoteLoading || quoteOptions.length === 0"
                            v-model="selectedAggregatorName"
                            :options="quoteOptions"
                        />
                    </q-item-section>
                    <q-item-section side>
                        <q-spinner
                            v-if="quoteLoading"
                            color="primary"
                        />
                    </q-item-section>
                </q-item>
                <template v-if="selectedQuote">
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
                </template>
            </q-list>

            <q-list
                bordered
                separator
            >
                <q-item-label header>{{$t('swap.label_slippage')}}</q-item-label>
                <q-item>
                    <q-item-section>
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
                        </div>
                    </q-item-section>
                    <q-item-section side>{{slippageTolerance}}%</q-item-section>
                </q-item>
                <q-item>
                    <q-item-section>
                        <q-input
                            dense
                            outlined
                            suffix="%"
                            inputmode="decimal"
                            :label="$t('swap.label_custom_slippage')"
                            v-model="customSlippage"
                            @input="onCustomSlippageChanged"
                        />
                    </q-item-section>
                </q-item>
            </q-list>

            <q-banner
                v-if="statusText"
                :class="statusClass"
            >
                {{statusText}}
            </q-banner>
        </page-content>

        <div class="q-pa-sm">
            <div class="narrow-page q-mx-auto">
                <signer-selector
                    v-if="selectedAddress"
                    :signer="selectedAddress"
                    :groups="signerGroups"
                    :gid="mainGid"
                    @select="onSignerChanged"
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
import AmountLabel from 'src/components/AmountLabel.vue'
import PageAction from 'src/components/PageAction.vue'
import PageContent from 'src/components/PageContent.vue'
import PageToolbar from 'src/components/PageToolbar.vue'
import TokenAvatar from 'src/components/TokenAvatar.vue'
import SignerSelector from 'src/pages/Sign/SignerSelector.vue'
import { SignerGroup } from 'src/pages/Sign/models'
import { buildSignerGroups } from 'src/pages/Sign/signer-groups'
import { genesises } from 'src/consts'
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

const MAIN_GID = genesises.main.id
const LAST_SIGNER_KEY = `last-signer-${MAIN_GID}`
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
        AmountLabel,
        PageAction,
        PageContent,
        PageToolbar,
        SignerSelector,
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
            selectedAddress: localStorage.getItem(LAST_SIGNER_KEY) || '',
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
        mainGid(): string {
            return MAIN_GID
        },
        mainWallets(): M.Wallet[] {
            return this.wallets.filter(wallet => swapNetworkOf(wallet.gid) === 'main')
        },
        signerGroups(): SignerGroup[] {
            return buildSignerGroups(this.mainWallets)
        },
        selectedWallet(): M.Wallet | null {
            const selected = this.selectedAddress.toLowerCase()
            return this.mainWallets.find(wallet => {
                return wallet.meta.addresses.some(address => address.toLowerCase() === selected)
            }) || null
        },
        supported(): boolean {
            return !!this.selectedWallet
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
        this.ensureSelectedSigner()
        await this.loadTokens()
        await this.loadBalances()
        this.scheduleQuote()
    },
    beforeDestroy() {
        window.clearTimeout(this.quoteTimer)
    },
    methods: {
        signerExists(address: string): boolean {
            const normalized = address.toLowerCase()
            return this.mainWallets.some(wallet => {
                return wallet.meta.addresses.some(item => item.toLowerCase() === normalized)
            })
        },
        ensureSelectedSigner() {
            if (this.selectedAddress && this.signerExists(this.selectedAddress)) {
                return
            }
            const group = this.signerGroups.find(item => item.addresses.length > 0)
            this.selectedAddress = group ? group.addresses[0] : ''
            if (this.selectedAddress) {
                localStorage.setItem(LAST_SIGNER_KEY, this.selectedAddress)
            }
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
        async onSignerChanged(address: string) {
            this.selectedAddress = address
            localStorage.setItem(LAST_SIGNER_KEY, address)
            await this.loadTokens()
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
                    actionLabel: this.$t('swap.action_swap').toString(),
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
