<template>
    <q-expansion-item
        group="log-item"
        v-bind="$attrs"
        expand-icon="keyboard_arrow_down"
        expanded-icon="keyboard_arrow_up"
        expand-separator
    >
        <template v-slot:header>
            <q-item-section avatar>
                <q-chip
                    square
                    dense
                    :class=" 'bg-' + logStyle.color"
                    class="text-white truncate-chip-labels"
                >
                    <q-icon :name="logStyle.icon" />
                </q-chip>
            </q-item-section>
            <q-item-section>
                <q-item-label lines="1">
                    <address-label :addr="addressText" :gid="token.gid" />
                </q-item-label>
                <q-item-label
                    caption
                    lines="2"
                    v-if="!dense"
                >
                    {{formatDate(log.meta.blockTimestamp)}}
                </q-item-label>
            </q-item-section>
            <q-item-section side>
                <span :class="'text-' + logStyle.color">
                    {{logStyle.mark}}
                    <amount-label
                        :value="amount"
                        :decimals="token.decimals"
                    > --.-- </amount-label>
                </span>
            </q-item-section>
        </template>
        <div class="asset-log-details text-caption">
            <q-item dense>
                <q-item-section class="asset-log-detail-label">
                    {{$t('asset.label_from')}}
                </q-item-section>
                <q-item-section
                    side
                    class="asset-log-detail-value"
                >
                    <address-label :addr="log.sender" :gid="token.gid" />
                </q-item-section>
            </q-item>
            <q-item dense>
                <q-item-section class="asset-log-detail-label">
                    {{$t('asset.label_to')}}
                </q-item-section>
                <q-item-section
                    side
                    class="asset-log-detail-value"
                >
                    <address-label :addr="log.recipient" :gid="token.gid" />
                </q-item-section>
            </q-item>
            <q-item dense>
                <q-item-section class="asset-log-detail-label">
                    {{$t('asset.label_amount')}}
                </q-item-section>
                <q-item-section
                    side
                    class="asset-log-detail-value"
                >
                    <span>
                        <amount-label
                            :value="amount"
                            :decimals="token.decimals"
                        >--.--</amount-label>
                        {{token.symbol}}
                    </span>
                </q-item-section>
            </q-item>
            <q-item dense>
                <q-item-section class="asset-log-detail-label">
                    {{$t('asset.label_token')}}
                </q-item-section>
                <q-item-section
                    side
                    class="asset-log-detail-value"
                >
                    {{token.symbol}}
                </q-item-section>
            </q-item>
            <q-item dense>
                <q-item-section class="asset-log-detail-label">
                    {{$t('asset.label_time')}}
                </q-item-section>
                <q-item-section
                    side
                    class="asset-log-detail-value"
                >
                    {{formatFullDate(log.meta.blockTimestamp)}}
                </q-item-section>
            </q-item>
            <q-item dense>
                <q-item-section class="asset-log-detail-label">
                    {{$t('asset.label_block')}}
                </q-item-section>
                <q-item-section
                    side
                    class="asset-log-detail-value"
                >
                    {{log.meta.blockNumber}}
                </q-item-section>
            </q-item>
            <q-item dense>
                <q-item-section class="asset-log-detail-label">
                    {{$t('asset.label_tx_hash')}}
                </q-item-section>
                <q-item-section
                    side
                    class="asset-log-detail-value asset-log-hash"
                >
                    {{shortTxID}}
                </q-item-section>
            </q-item>
            <q-item dense>
                <q-item-section />
                <q-item-section side>
                    <div class="asset-log-actions">
                        <q-btn
                            rounded
                            @click="copy(log.meta.txID)"
                            flat
                            dense
                            icon="content_copy"
                            :aria-label="$t('common.copy').toString()"
                            :title="$t('common.copy').toString()"
                        />
                        <q-btn
                            v-if="logTxExplorerUrl"
                            rounded
                            @click="viewOnExplorer"
                            dense
                            flat
                            icon="search"
                            :aria-label="$t('common.view_on_explorer').toString()"
                            :title="$t('common.view_on_explorer').toString()"
                        />
                    </div>
                </q-item-section>
            </q-item>
        </div>
    </q-expansion-item>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import AddressLabel from 'src/components/AddressLabel.vue'
import { openURL } from 'src/utils/open-url'
import AmountLabel from 'components/AmountLabel.vue'
import { TransferLogItem } from './models'
import { formatDate } from 'src/utils/format'
import { copyText } from 'src/utils/clipboard'
import { txExplorerUrl } from 'src/utils/explorer'

export default defineComponent({
    components: {
        AddressLabel,
        AmountLabel
    },
    props: {
        log: Object as () => TransferLogItem,
        address: String,
        dense: Boolean
    },
    computed: {
        token(): M.TokenSpec {
            return this.log.token
        },
        amount(): string | number {
            return this.log.amount
        },
        addressText(): string {
            return this.log.direction === '+' ? this.log.sender : this.log.recipient
        },
        logStyle(): { icon: string, color: string, mark: string } {
            if (this.log.direction === '+') {
                return {
                    icon: 'arrow_downward',
                    color: 'positive',
                    mark: this.log.direction
                }
            } else {
                return {
                    icon: 'arrow_upward',
                    color: 'negative',
                    mark: this.log.direction
                }
            }
        },
        logTxExplorerUrl(): string {
            return txExplorerUrl(this.log.token.gid, this.log.meta.txID)
        },
        shortTxID(): string {
            const txID = this.log.meta.txID
            return txID.length > 20 ? `${txID.slice(0, 10)}...${txID.slice(-8)}` : txID
        }
    },
    methods: {
        formatDate(timestamp: number) {
            return formatDate(timestamp * 1000, { relative: true })
        },
        formatFullDate(timestamp: number) {
            return formatDate(timestamp * 1000)
        },
        viewOnExplorer() {
            this.logTxExplorerUrl && openURL(this.logTxExplorerUrl)
        },
        async copy(str: string) {
            try {
                await copyText(str)
                this.$q.notify(this.$t('common.copied').toString())
            } catch {
                this.$q.notify({
                    type: 'negative',
                    message: this.$t('common.copy_failed').toString()
                })
            }
        }
    }
})
</script>
<style lang="sass" scoped>
.asset-log-details
    padding-top: 6px
    padding-bottom: 8px
    line-height: 1.35

.asset-log-details :deep(.q-item)
    min-height: 26px
    padding-top: 1px
    padding-bottom: 1px

.asset-log-details :deep(.q-item__section--side)
    padding-left: 12px

.asset-log-detail-label
    flex: 0 0 84px
    color: #616161

.asset-log-detail-value
    min-width: 0
    max-width: calc(100% - 96px)
    white-space: normal
    text-align: left

.asset-log-hash
    font-family: monospace

.asset-log-actions
    display: flex
    gap: 16px
    justify-content: flex-end

@media (max-width: 420px)
    .asset-log-detail-label
        flex-basis: 72px

    .asset-log-detail-value
        max-width: calc(100% - 80px)
</style>
