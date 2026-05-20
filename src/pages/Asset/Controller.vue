<template>
    <div
        class="fit column no-wrap"
    >
        <page-toolbar
            :title="$t('asset.title')"
            :gid="wallet && wallet.gid"
        />
        <template v-if="canShowAsset">
            <page-content>
                <async-resolve
                    :promise="$svc.bc(token.gid).balanceOf(address, token)"
                    v-slot={data}
                >
                    <head-item
                        :token="token"
                        :balance="data"
                    >
                        <q-item-label class="row">
                            {{token.symbol}}
                            <amount-label class="q-ml-auto" :value="data" :decimals="token.decimals" > --.-- </amount-label>
                        </q-item-label>
                        <q-item-label caption lines="1">{{wallet.meta.name}}</q-item-label>
                        <q-item-label caption>
                            ┗ <address-label :addr="address" :gid="wallet.gid" />
                        </q-item-label>
                    </head-item>
                </async-resolve>
                <q-item dense>
                    <q-item-section>
                        <q-item-label header>
                            {{$t('asset.label_history')}}
                        </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <q-btn
                            flat
                            round
                            icon="send"
                            :aria-label="$t('send.action_send').toString()"
                            :title="$t('send.action_send').toString()"
                            :to="{name: 'send', query: { wid: walletId, i: addressIndex, symbol: symbol }}"
                        />
                    </q-item-section>
                </q-item>
            </page-content>
            <page-content class="col">
                <Logs
                    :address="address"
                    :token="token"
                    :pageSize="20"
                />
            </page-content>
        </template>
        <template v-else>
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
        </template>
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import Logs from './Logs.vue'
import HeadItem from './HeadItem.vue'
import AsyncResolve from 'components/AsyncResolve'
import PageToolbar from 'components/PageToolbar.vue'
import PageContent from 'components/PageContent.vue'
import PageAction from 'components/PageAction.vue'
import AddressLabel from 'components/AddressLabel.vue'
import AmountLabel from 'components/AmountLabel.vue'
import { parseRouteInteger } from 'src/utils/route'
export default defineComponent({
    components: {
        Logs,
        HeadItem,
        AsyncResolve,
        PageToolbar,
        PageContent,
        PageAction,
        AddressLabel,
        AmountLabel
    },
    data() {
        return {
            showQR: false
        }
    },
    props: {
        walletId: String,
        addressIndex: String,
        symbol: String
    },
    asyncComputed: {
        wallet(): Promise<M.Wallet | null> {
            const id = this.walletIdNumber
            return id === null ? Promise.resolve(null) : this.$svc.wallet.get(id)
        },
        token: {
            async get(): Promise<M.TokenSpec | null> {
                const wallet = this.wallet
                if (!wallet) {
                    return null
                }
                const [tokens, activeSymbols] = await Promise.all([
                    this.$svc.config.token.all(),
                    this.$svc.config.token.activeSymbols()
                ])
                return tokens.filter(token => {
                    return token.gid === wallet.gid &&
                        (activeSymbols.includes(token.symbol) || token.permanent)
                }).find(token => token.symbol === this.symbol) || null
            },
            default: null
        }
    },
    computed: {
        walletIdNumber(): number | null {
            return parseRouteInteger(this.walletId)
        },
        addressIndexNumber(): number | null {
            return parseRouteInteger(this.addressIndex)
        },
        address(): string {
            const index = this.addressIndexNumber
            return this.wallet && index !== null ? this.wallet.meta.addresses[index] || '' : ''
        },
        canShowAsset(): boolean {
            return !!this.wallet && !!this.address && !!this.token
        },
        invalidContextMessage(): string {
            if (!this.wallet) {
                return this.$t('address.msg_wallet_not_found').toString()
            }
            if (!this.address) {
                return this.$t('address.msg_address_not_found').toString()
            }
            return this.$t('asset.msg_asset_not_found').toString()
        }
    }
})
</script>
