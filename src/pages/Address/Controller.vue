<template>
    <div class="fit column no-wrap">
        <page-toolbar
            :title="$t('address.title')"
            :gid="wallet && wallet.gid"
        >
            <q-btn
                v-if="canShowAddress && visibleOptionSheets.length > 0"
                flat
                round
                icon="more_horiz"
                :aria-label="$t('common.more').toString()"
                :title="$t('common.more').toString()"
            >
                <pop-sheets :sheets="optionSheets" />
            </q-btn>
        </page-toolbar>
        <template v-if="canShowAddress">
            <page-content>
                <head-item
                    :address="address"
                    :gid="wallet.gid"
                    :name="wallet.meta.name"
                    :primary-name="primaryName"
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
                            :aria-label="$t('settings.action_token_list').toString()"
                            :title="$t('settings.action_token_list').toString()"
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
                                :aria-label="$t('common.view').toString()"
                                :title="$t('common.view').toString()"
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
                                :aria-label="$t('send.action_send').toString()"
                                :title="$t('send.action_send').toString()"
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
import TokenItem from './TokenItem.vue'
import HeadItem from './HeadItem.vue'
import AsyncResolve from 'components/AsyncResolve'
import PageToolbar from 'components/PageToolbar.vue'
import PageContent from 'components/PageContent.vue'
import PageAction from 'components/PageAction.vue'
import PopSheets, { Sheet } from 'components/PopSheets.vue'
import ProfileDialog from './ProfileDialog.vue'
import { supportsVetDomainProfile } from 'src/utils/vet-domain-profile'
import { parseRouteInteger } from 'src/utils/route'

export default defineComponent({
    components: {
        TokenItem,
        HeadItem,
        AsyncResolve,
        PageToolbar,
        PageContent,
        PageAction,
        PopSheets
    },
    props: {
        walletId: String,
        addressIndex: String
    },
    asyncComputed: {
        wallet(): Promise<M.Wallet | null> {
            const id = this.walletIdNumber
            return id === null ? Promise.resolve(null) : this.$svc.wallet.get(id)
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
            default: () => []
        },
        primaryName: {
            async get(): Promise<string> {
                const wallet = this.wallet
                if (!wallet || !this.address) {
                    return ''
                }
                this.$svc.bc(wallet.gid).vetDomainsRevision()
                const [name] = await this.$svc.bc(wallet.gid).vetDomainsNamesOf([this.address])
                return name
            },
            default: ''
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
        canShowAddress(): boolean {
            return !!this.wallet && !!this.address
        },
        invalidContextMessage(): string {
            return this.wallet
                ? this.$t('address.msg_address_not_found').toString()
                : this.$t('address.msg_wallet_not_found').toString()
        },
        canExportPrivateKey(): boolean {
            return !!this.wallet && this.wallet.meta.type !== 'ledger'
        },
        optionSheets(): Sheet[] {
            return [{
                label: this.$t('address.action_edit_vns_profile').toString(),
                action: () => { void this.onEditVnsProfile() },
                hidden: !this.wallet || !this.primaryName || !supportsVetDomainProfile(this.wallet.gid)
            }, {
                label: this.$t('address.action_export_private_key').toString(),
                action: () => { void this.onExportPrivateKey() },
                hidden: !this.canExportPrivateKey
            }]
        },
        visibleOptionSheets(): Sheet[] {
            return this.optionSheets.filter(sheet => !sheet.hidden)
        }
    },
    methods: {
        async onEditVnsProfile() {
            const wallet = this.wallet
            if (!wallet || !this.primaryName) {
                return
            }
            try {
                await this.$dialog<void>({
                    component: ProfileDialog,
                    wallet,
                    address: this.address,
                    name: this.primaryName
                })
            } catch { }
        },
        onExportPrivateKey() {
            const wallet = this.wallet
            const addressIndex = this.addressIndexNumber
            if (!wallet || addressIndex === null || !this.address || wallet.meta.type === 'ledger') {
                return
            }

            this.$router.push({
                name: 'backup',
                params: { walletId: wallet.id.toString() },
                query: { privateKey: '1', i: addressIndex.toString() }
            })
        }
    }
})
</script>
