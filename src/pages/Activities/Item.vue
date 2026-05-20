<template>
    <q-expansion-item
        group="item"
        expand-icon-class="hidden"
    >
        <template v-slot:header>
            <q-item-section>
                <q-item-label>{{ title }}</q-item-label>
                <q-item-label
                    caption
                    lines="1"
                >{{ entry.walletName || $t('common.unknown') }}</q-item-label>
                <q-item-label caption>
                    ┗
                    <address-label :addr="entry.signer" :gid="entry.gid" />
                </q-item-label>
                <q-item-label caption>
                    {{formatDate(entry.time)}}
                </q-item-label>
            </q-item-section>
            <q-item-section
                top
                side
            >
                <q-item-label>
                    <q-icon
                        v-if="icon.name"
                        class="q-pa-none"
                        size="xs"
                        :name="icon.name"
                        :color="icon.color"
                    />
                    <q-badge
                        v-if="entry.status === 'reverted'"
                        color="warning"
                        text-color="white"
                        :label="$t('activities.label_reverted')"
                    />
                    <span
                        class="text-red"
                        v-if="entry.status === 'expired'"
                    > {{$t('activities.label_expired')}} </span>
                </q-item-label>
                <q-item-label>
                    <q-badge
                        v-if="networkBadgeText"
                        color="negative"
                        class="no-pointer-events text-bold"
                    >
                        {{networkBadgeText}}
                    </q-badge>
                </q-item-label>
            </q-item-section>
        </template>
        <template>
            <q-item v-if="['success?', 'reverted?', 'sending'].includes(entry.status)">
                <q-item-section />
                <q-item-section />
                <q-item-section side>
                    <q-item-label
                        caption
                        lines="1"
                    >
                        <span v-if="entry.status === 'sending'"> {{$t('activities.label_sending')}} </span>
                        <span v-if="['success?', 'reverted?'].includes(entry.status)">
                            <q-icon name="hourglass_top" /> {{entry.confirming}}
                        </span>
                    </q-item-label>
                </q-item-section>
            </q-item>
            <q-item v-if="entry.comment">
                <q-item-section>
                    <q-item-label class="text-body2">
                        {{entry.comment}}
                    </q-item-label>
                </q-item-section>
                <q-item-section />
            </q-item>
            <q-item>
                <q-item-section />
                <q-item-section />
                <q-item-section side>
                    <div class="q-gutter-md">
                        <q-btn
                            rounded
                            flat
                            dense
                            v-if="entry.link"
                            @click="openLink(entry.link)"
                            icon="link"
                            :aria-label="$t('common.open_link').toString()"
                            :title="$t('common.open_link').toString()"
                        />
                        <template v-if="entry.type === 'tx' && entry.id">
                            <q-btn
                                rounded
                                @click="entry.id && copy(entry.id)"
                                flat
                                dense
                                icon="content_copy"
                                :aria-label="$t('common.copy').toString()"
                                :title="$t('common.copy').toString()"
                            />
                            <q-btn
                                v-if="entryTxExplorerUrl"
                                rounded
                                @click="viewOnExplorer"
                                dense
                                flat
                                icon="search"
                                :aria-label="$t('common.view_on_explorer').toString()"
                                :title="$t('common.view_on_explorer').toString()"
                            />
                        </template>
                        <q-btn
                            v-else
                            flat
                            @click="viewContent"
                            rounded
                            dense
                            icon="message"
                            :aria-label="$t('common.view').toString()"
                            :title="$t('common.view').toString()"
                        />
                    </div>
                </q-item-section>
            </q-item>
        </template>
    </q-expansion-item>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { openURL } from 'src/utils/open-url'
import { genesises } from 'src/consts'
import AddressLabel from 'src/components/AddressLabel.vue'
import { formatDate } from 'src/utils/format'
import { copyText } from 'src/utils/clipboard'
import { txExplorerUrl } from 'src/utils/explorer'

export type Entry = {
    gid: string
    type: 'tx' | 'cert'
    walletName: string
    signer: string
    comment: string
    time: number
    link: string
    status: 'reverted' | 'reverted?' | 'success' | 'success?' | 'sending' | 'expired'
    message?: string
    id: string
    confirming?: string
}

export default defineComponent({
    components: { AddressLabel },
    props: {
        entry: Object as () => Entry
    },
    computed: {
        title(): string {
            return this.entry.type === 'tx' ? this.$t('common.transaction').toString() : this.$t('common.certificate').toString()
        },
        icon(): { name: string, color: string } {
            const result: { name: string, color: string } = { name: '', color: '' }
            switch (this.entry.status) {
                case 'success': {
                    result.name = 'done_all'
                    result.color = 'positive'
                    break
                }
                case 'success?': {
                    result.name = 'done'
                    result.color = 'info'
                    break
                }
                case 'reverted?': {
                    result.name = 'published_with_changes'
                    result.color = 'warning'
                    break
                }
                case 'sending': {
                    result.name = 'query_builder'
                    result.color = 'info'
                    break
                }
            }
            return result
        },
        entryTxExplorerUrl(): string {
            return txExplorerUrl(this.entry.gid, this.entry.id)
        },
        networkBadgeText(): string {
            if (this.entry.gid === genesises.main.id) {
                return ''
            }
            return this.$netDisplayName(this.entry.gid)
        }
    },
    methods: {
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
        },
        openLink(link: string) {
            const regexp = this.entry.type === 'tx' ? /{txid}/g : /{certid}/g
            openURL(link.replace(regexp, this.entry.id))
        },
        viewOnExplorer() {
            this.entryTxExplorerUrl && openURL(this.entryTxExplorerUrl)
        },
        viewContent() {
            this.$q.dialog({
                parent: this,
                title: this.$t('activities.title_signed_content').toString(),
                message: this.entry.message,
                ok: false
            })
        },
        formatDate(date: number) {
            return formatDate(date, { relative: true })
        }
    }
})
</script>
