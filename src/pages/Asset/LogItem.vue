<template>
    <q-expansion-item
        group="log-item"
        v-bind="$attrs"
        expand-icon-class="hidden"
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
        <template>
            <q-item>
                <q-item-section />
                <q-item-section />
                <q-item-section side>
                    <div class="q-gutter-md">
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
        </template>
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
        }
    },
    methods: {
        formatDate(timestamp: number) {
            return formatDate(timestamp * 1000, { relative: true })
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
