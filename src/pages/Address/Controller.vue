<template>
    <div class="fit column no-wrap">
        <page-toolbar
            :title="$t('address.title')"
            :gid="wallet && wallet.gid"
        >
            <q-btn
                v-if="visibleOptionSheets.length > 0"
                flat
                round
                icon="more_horiz"
                :aria-label="$t('common.more').toString()"
                :title="$t('common.more').toString()"
            >
                <pop-sheets :sheets="optionSheets" />
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
    </div>
</template>
<script lang="ts">
import Vue from 'vue'
import TokenItem from './TokenItem.vue'
import HeadItem from './HeadItem.vue'
import AsyncResolve from 'components/AsyncResolve'
import PageToolbar from 'components/PageToolbar.vue'
import PageContent from 'components/PageContent.vue'
import PopSheets, { Sheet } from 'components/PopSheets.vue'
import PromptDialog, { PromptOptions } from 'pages/Index/PromptDialog.vue'
import PrivateKeyDialog from './PrivateKeyDialog.vue'
import ProfileDialog from './ProfileDialog.vue'
import { Vault } from 'src/core/vault'
import { formatPrivateKey } from 'src/utils/private-key'
import { supportsVetDomainProfile } from 'src/utils/vet-domain-profile'

export default Vue.extend({
    components: {
        TokenItem,
        HeadItem,
        AsyncResolve,
        PageToolbar,
        PageContent,
        PopSheets
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
        addressIndexNumber(): number {
            return parseInt(this.addressIndex)
        },
        address(): string {
            return this.wallet ? this.wallet.meta.addresses[this.addressIndexNumber] : ''
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
