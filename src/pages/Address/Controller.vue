<template>
    <div class="fit column no-wrap">
        <page-toolbar
            :title="$t('address.title')"
            :gid="wallet && wallet.gid"
        >
            <q-btn
                v-if="canExportPrivateKey"
                flat
                round
                icon="vpn_key"
                @click="onExportPrivateKey"
            >
                <q-tooltip>{{$t('address.action_export_private_key')}}</q-tooltip>
            </q-btn>
        </page-toolbar>
        <template v-if="wallet">
            <page-content>
                <head-item
                    :address="address"
                    :gid="wallet.gid"
                    :name="wallet.meta.name"
                />
                <q-item dense>
                    <q-item-section>
                        <q-item-label header>
                            {{$t('address.label_assets')}}
                        </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <q-btn
                            :to="{name: 'tokens-setting'}"
                            flat
                            round
                            icon="control_point_duplicate"
                        />
                    </q-item-section>
                </q-item>
            </page-content>
            <page-content class="col">
                <q-list>
                    <async-resolve
                        v-for="(token, index) in tokenList"
                        tag="div"
                        :promise="$svc.bc(token.gid).balanceOf(address, token)"
                        v-slot="{data}"
                        :key="token.symbol"
                    >
                        <q-separator
                            v-if="index !== 0"
                            inset="item"
                        />
                        <token-item
                            :token="token"
                            :balance="data"
                        >
                            <q-btn
                                icon="preview"
                                dense
                                flat
                                :to="{
                                    name: 'asset',
                                    params: {
                                        walletId: walletId,
                                        addressIndex: addressIndex,
                                        symbol: token.symbol
                                    }
                                }"
                            />
                            <q-btn
                                icon="send"
                                dense
                                flat
                                :to="{
                                    name: 'send',
                                    query: { wid: walletId, i: addressIndex, symbol: token.symbol }
                                }"
                            />
                        </token-item>
                    </async-resolve>
                </q-list>
            </page-content>
        </template>
    </div>
</template>
<script lang="ts">
import Vue from 'vue'
import TokenItem from './TokenItem.vue'
import HeadItem from './HeadItem.vue'
import AsyncResolve from 'components/AsyncResolve'
import PageToolbar from 'components/PageToolbar.vue'
import PageContent from 'components/PageContent.vue'
import PromptDialog, { PromptOptions } from 'pages/Index/PromptDialog.vue'
import PrivateKeyDialog from './PrivateKeyDialog.vue'
import { Vault } from 'src/core/vault'
import { formatPrivateKey } from 'src/utils/private-key'

export default Vue.extend({
    components: {
        TokenItem,
        HeadItem,
        AsyncResolve,
        PageToolbar,
        PageContent
    },
    props: {
        walletId: String,
        addressIndex: String
    },
    asyncComputed: {
        wallet(): Promise<M.Wallet | null> {
            return this.$svc.wallet.get(parseInt(this.walletId))
        },
        tokenList: {
            async get(): Promise<M.TokenSpec[]> {
                const wallet = this.wallet
                if (!wallet) {
                    return []
                }
                const [tokens, activeSymbols] = await Promise.all([
                    this.$svc.config.token.all(),
                    this.$svc.config.token.activeSymbols()
                ])
                return tokens.filter(token => token.gid === wallet.gid && (activeSymbols.includes(token.symbol) || token.permanent))
            },
            default: []
        }
    },
    computed: {
        addressIndexNumber(): number {
            return parseInt(this.addressIndex)
        },
        address(): string {
            return this.wallet ? this.wallet.meta.addresses[this.addressIndexNumber] : ''
        },
        canExportPrivateKey(): boolean {
            return !!this.wallet && this.wallet.meta.type !== 'ledger'
        }
    },
    methods: {
        async onExportPrivateKey() {
            const wallet = this.wallet
            if (!wallet || wallet.meta.type === 'ledger') {
                return
            }

            try {
                const opts: PromptOptions = {
                    title: this.$t('address.action_export_private_key').toString(),
                    message: this.$t('address.msg_export_private_key_warning').toString(),
                    model: '',
                    action: {
                        label: this.$t('common.continue').toString(),
                        color: 'negative'
                    },
                    validate: input => input.trim() === 'EXPORT' ? '' : this.$t('common.invalid_input').toString()
                }
                await this.$dialog<string>({
                    component: PromptDialog,
                    opts
                })

                const umk = await this.$authenticate()
                let privateKey = ''
                await this.$loading(() => {
                    const vault = Vault.decode(wallet.vault)
                    const key = vault.derive(this.addressIndexNumber).unlock(umk)
                    try {
                        privateKey = formatPrivateKey(key)
                    } finally {
                        key.fill(0)
                    }
                    return Promise.resolve()
                })

                await this.$dialog({
                    component: PrivateKeyDialog,
                    privateKey
                })
            } catch { }
        }
    }
})
</script>
