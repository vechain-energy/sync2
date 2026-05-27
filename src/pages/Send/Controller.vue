<template>
    <q-form
        class="column fit no-wrap"
        v-if="canSend"
        @submit="onSend"
    >
        <page-toolbar
            :title="$t('send.title')"
            :gid="wallet && wallet.gid"
        />
        <page-content class="col no-wrap">
            <q-item-label header>{{$t('send.label_to')}}</q-item-label>
            <To
                v-model="to"
                class="q-mx-md"
                :gid="wallet && wallet.gid"
                :wallets="toWallets"
                :error-message="errors.to"
                :error="!!errors.to"
                @change="errors.to = ''"
            />
            <q-item-label header>{{$t('send.label_asset')}}</q-item-label>
            <TokenSelector
                :tokens="tokenList"
                v-model="sym"
                :address="address"
            />
            <q-item-label header>{{$t('send.label_amount')}}</q-item-label>
            <q-input
                no-error-icon
                :aria-label="$t('send.label_amount').toString()"
                autocomplete="off"
                class="q-mx-md"
                v-model="amount"
                :error-message="errors.amount"
                :error="!!errors.amount"
                @update:model-value="errors.amount = ''"
                dense
                type="text"
                inputmode="decimal"
                placeholder="0.00"
                outlined
                spellcheck="false"
            >
                <template v-slot:append>
                    <q-btn
                        type="button"
                        dense
                        flat
                        color="primary"
                        :disable="!canSetMax"
                        :label="$t('send.action_max')"
                        @click="setMaxAmount"
                    />
                </template>
            </q-input>
        </page-content>
        <page-action>
            <q-btn
                type="submit"
                unelevated
                class="col-6 col-sm-auto"
                color="primary"
                :label="$t('send.action_send')"
            />
        </page-action>
    </q-form>
    <div
        v-else
        class="column fit no-wrap"
    >
        <page-toolbar :title="$t('send.title')" />
        <page-content class="col">
            <q-item-label header>
                {{invalidContextMessage}}
            </q-item-label>
        </page-content>
        <page-action>
            <q-btn
                unelevated
                class="col-6 col-sm-auto"
                color="primary"
                :label="$t('common.back')"
                @click="$backOrHome()"
            />
        </page-action>
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { abi, address } from 'thor-devkit'
import { BigNumber } from 'bignumber.js'
import { abis } from 'src/consts'
import To from './To.vue'
import TokenSelector from './TokenSelector.vue'
import { AddressGroup } from './models'
import PageToolbar from 'components/PageToolbar.vue'
import PageContent from 'components/PageContent.vue'
import PageAction from 'components/PageAction.vue'
import { rawTokenAmountToInput, toWei } from 'src/utils/format'
import { isVetDomainName } from 'src/utils/vet-domains'
import { dialogErrorMessage } from 'src/utils/dialog-error'
import { parseRouteInteger } from 'src/utils/route'

export default defineComponent({
    components: {
        To,
        TokenSelector,
        PageToolbar,
        PageContent,
        PageAction
    },
    props: {
        wid: String,
        i: String,
        symbol: String
    },
    data() {
        return {
            to: null as null | string,
            amount: '',
            sym: this.symbol || 'VET',
            errors: {
                to: '',
                amount: ''
            }
        }
    },
    asyncComputed: {
        wallet(): Promise<M.Wallet | null> {
            const id = this.walletIdNumber
            return id === null ? Promise.resolve(null) : this.$svc.wallet.get(id)
        },
        recent: {
            async get(): Promise<string[]> {
                if (!this.wallet) {
                    return []
                }
                return this.$svc.config.getRecentRecipients(this.wallet.gid)
            },
            default: () => []
        },
        wallets: {
            async get(): Promise<M.Wallet[]> {
                if (!this.wallet) {
                    return []
                }
                return await this.$svc.wallet.getByGid(this.wallet.gid)
            },
            default: () => []
        },
        tokenList: {
            async get(): Promise<M.TokenSpec[]> {
                const w = this.wallet
                if (!w) {
                    return []
                }
                const [tokens = [], activeSymbols = []] = await Promise.all(
                    [
                        this.$svc.config.token.all(),
                        this.$svc.config.token.activeSymbols()
                    ]
                )
                return tokens.filter(token => {
                    return token.gid === w.gid &&
                        (activeSymbols.includes(token.symbol) || token.permanent)
                })
            },
            default: () => []
        },
        smartAccounts: {
            async get(): Promise<M.SmartAccount[]> {
                return this.wallet ? this.$svc.bc(this.wallet.gid).smartAccountsOf(this.wallet) : []
            },
            default: () => [] as M.SmartAccount[]
        },
        currentBalance: {
            async get(): Promise<string> {
                const token = this.currentToken
                if (!token || !this.address) {
                    return '0'
                }
                try {
                    return await this.$svc.bc(token.gid).balanceOf(this.address, token)
                } catch (error) {
                    console.warn('load send balance:', error)
                    return '0'
                }
            },
            default: '0'
        }
    },
    computed: {
        walletIdNumber(): number | null {
            return parseRouteInteger(this.wid)
        },
        addressIndexNumber(): number | null {
            return parseRouteInteger(this.i)
        },
        canSend(): boolean {
            return !!this.wallet && !!this.address && this.tokenList.length > 0 && !!this.currentToken
        },
        invalidContextMessage(): string {
            if (!this.wallet || !this.address) {
                return this.$t('send.msg_select_wallet').toString()
            }
            return this.$t('send.msg_no_asset').toString()
        },
        toWallets(): AddressGroup[] {
            let list = [...this.wallets.map<AddressGroup>(w => { return { name: w.meta.name, list: w.meta.addresses } })]
            if (this.recent.length) {
                list = [
                    {
                        name: this.$t('send.label_recent_transfer').toString(),
                        list: this.recent
                    },
                    ...list
                ]
            }
            return list
        },
        currentToken(): M.TokenSpec | undefined {
            return this.tokenList.find(item => item.symbol === this.sym)
        },
        addresses(): string[] {
            return this.wallet ? [
                ...this.wallet.meta.addresses,
                ...this.smartAccounts.map(account => account.address)
            ] : []
        },
        canSetMax(): boolean {
            return new BigNumber(this.currentBalance || 0).isGreaterThan(0)
        },
        from(): string {
            const index = this.addressIndexNumber
            return this.wallet && index !== null ? this.addresses[index] || '' : ''
        },
        address(): string {
            const index = this.addressIndexNumber
            return this.wallet && index !== null ? this.addresses[index] || '' : ''
        }
    },
    watch: {
        tokenList(): void {
            this.ensureSelectedToken()
        },
        symbol(value?: string): void {
            this.sym = value || 'VET'
            this.ensureSelectedToken()
        }
    },
    methods: {
        isAddress: address.test,
        fallbackToken(): M.TokenSpec | undefined {
            return this.tokenList.find(token => token.symbol === 'VET') || this.tokenList[0]
        },
        ensureSelectedToken(): void {
            if (this.currentToken || this.tokenList.length === 0) {
                return
            }
            const token = this.fallbackToken()
            if (!token) {
                return
            }
            this.sym = token.symbol
        },
        checkSumAddress(v: string): boolean {
            return !(v !== v.toLowerCase() && address.toChecksumed(v) !== v)
        },
        setMaxAmount(): void {
            const token = this.currentToken
            if (!token || !this.canSetMax) {
                return
            }
            this.amount = rawTokenAmountToInput(this.currentBalance, token.decimals)
            this.errors.amount = ''
        },
        balanceCheck(v: string): boolean {
            const token = this.currentToken
            if (!token) {
                return false
            }
            let pattern = '^(([1-9]{1}\\d*)|(0{1}))'
            if (token.decimals > 0) {
                pattern += `(\\.\\d{1,${token.decimals}})?$`
            } else {
                pattern += '$'
            }
            const regexp = new RegExp(pattern)
            return regexp.test(v) ? parseFloat(v) > 0 : false
        },
        validate(): boolean {
            const to = this.to || ''
            if (this.isAddress(to)) {
                this.errors.to = this.checkSumAddress(to) ? '' : this.$t('send.msg_invalid_address_checksum').toString()
            } else if (isVetDomainName(to)) {
                this.errors.to = this.$t('send.msg_vet_domain_unresolved').toString()
            } else {
                this.errors.to = this.$t('send.msg_invalid_address').toString()
            }

            this.errors.amount = this.balanceCheck(this.amount) ? '' : this.$t('send.msg_invalid_amount').toString()

            return (!this.errors.to && !this.errors.amount)
        },
        async onSend() {
            if (!this.validate()) {
                return
            }
            const token = this.currentToken
            const wallet = this.wallet
            if (!token || !wallet) {
                return
            }
            let msgItem!: Connex.Vendor.TxMessage[0]
            let comment = ''
            if (this.sym === 'VET') {
                comment = `${this.$t('send.title')} ${this.amount} VET`
                msgItem = {
                    to: this.to,
                    value: toWei(this.amount, token.decimals),
                    comment
                }
            } else {
                const func = new abi.Function(abis.transfer)
                comment = `${this.$t('send.title')} ${this.amount} ${this.sym}`
                const data = func.encode(this.to, toWei(this.amount, token.decimals))
                msgItem = {
                    to: token.address,
                    value: 0,
                    data: data,
                    comment
                }
            }
            try {
                await this.$signTx(wallet.gid, {
                    message: [msgItem],
                    options: {
                        signer: this.from,
                        comment: comment
                    }
                })
                this.$gtag.event('token-send', { event_label: this.sym })
                const temp = [this.to, ...this.recent].reduce((result: string[], cv: string | null) => {
                    (cv && !result.includes(cv.toLowerCase())) && result.push(cv.toLowerCase())
                    return result
                }, []).slice(0, 10)
                if (this.wallet) {
                    this.$svc.config.saveRecentRecipients(this.wallet.gid, temp)
                }
                this.$router.replace({ name: 'sign-success', query: { type: 'tx' } })
            } catch (err) {
                const message = dialogErrorMessage(err, this.$t('common.something_wrong').toString())
                if (!message) {
                    return
                }
                this.$q.notify({
                    type: 'negative',
                    message
                })
            }
        }
    }
})
</script>
