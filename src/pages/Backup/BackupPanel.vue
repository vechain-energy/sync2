<template>
    <q-tab-panels
        class="col"
        animated
        v-model="panel"
        transition-next="jump-up"
    >
        <q-tab-panel
            name="notice"
            class="column q-pa-none no-wrap"
        >
            <page-content
                padding
                class="col"
                innerClass="fit column justify-evenly"
            >
                <notice :mode="mode" />
            </page-content>
            <page-action>
                <q-btn
                    :label="$t('common.next')"
                    unelevated
                    color="primary"
                    @click="$emit('start')"
                />
            </page-action>
        </q-tab-panel>
        <q-tab-panel
            name="private-key"
            class="column q-pa-none no-wrap"
        >
            <page-content class="col q-pa-sm">
                <PrivateKey
                    :private-key="privateKey"
                    :address="address"
                />
            </page-content>
            <page-action>
                <q-btn
                    outline
                    color="primary"
                    icon="content_copy"
                    :label="$t('common.copy')"
                    @click="copyPrivateKey"
                />
                <q-btn
                    :label="$t('common.finish')"
                    unelevated
                    @click="onFinish"
                    color="primary"
                />
            </page-action>
        </q-tab-panel>
        <q-tab-panel
            name="words"
            class="column q-pa-none no-wrap"
        >
            <page-content class="col q-pa-sm">
                <Words :words="words" />
            </page-content>
            <page-action>
                <q-btn
                    :label="$t('backup.action_next_verify')"
                    unelevated
                    @click="$emit('next')"
                    color="primary"
                />
            </page-action>
        </q-tab-panel>
        <q-tab-panel
            name="check"
            class="column q-pa-none no-wrap"
        >
            <page-content
                class="col q-pa-sm"
                innerClass="fit"
            >
                <CheckWords
                    :words="words"
                    @checked="$emit('next')"
                />
            </page-content>
        </q-tab-panel>
        <q-tab-panel
            name="done"
            class="column q-pa-none no-wrap"
        >
            <page-content
                class="column fit"
                innerClass="fit column justify-evenly"
            >
                <q-list class="text-center">
                    <q-item>
                        <q-item-section>
                            <q-icon
                                size="4rem"
                                class="q-mx-auto"
                                name="verified_user"
                                color="positive"
                            />
                        </q-item-section>
                    </q-item>
                    <q-item>
                        <q-item-section>
                            <q-item-label class="text-h6 text-dark">{{$t('backup.label_backed_up')}}</q-item-label>
                        </q-item-section>
                    </q-item>
                    <q-item>
                        <q-item-section>
                            <q-item-label class="text-body1 text-dark">{{$t('backup.msg_backed_up')}}</q-item-label>
                        </q-item-section>
                    </q-item>

                </q-list>
            </page-content>
            <page-action>
                <q-btn
                    :label="$t('common.finish')"
                    unelevated
                    @click="onFinish"
                    color="primary"
                />
            </page-action>
        </q-tab-panel>
    </q-tab-panels>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import Words from './Words.vue'
import CheckWords from './CheckWords.vue'
import Notice from './Notice.vue'
import PrivateKey from './PrivateKey.vue'
import PageContent from 'src/components/PageContent.vue'
import PageAction from 'src/components/PageAction.vue'
import { copyText } from 'src/utils/clipboard'
export default defineComponent({
    emits: ['start', 'next', 'done'],
    props: {
        panel: String,
        mode: {
            type: String as () => 'mnemonic' | 'private-key',
            default: 'mnemonic'
        },
        walletId: Number,
        words: {
            type: Array as () => string[],
            default: () => []
        },
        privateKey: {
            type: String,
            default: ''
        },
        address: {
            type: String,
            default: ''
        },
        meta: {
            type: Object as () => M.Wallet.Meta,
            default: () => {}
        }
    },
    components: {
        Words,
        CheckWords,
        Notice,
        PrivateKey,
        PageContent,
        PageAction
    },
    data() {
        return {}
    },
    methods: {
        async copyPrivateKey() {
            try {
                await copyText(this.privateKey)
                this.$q.notify(this.$t('common.copied').toString())
            } catch {
                this.$q.notify({
                    type: 'negative',
                    message: this.$t('common.copy_failed').toString()
                })
            }
        },
        async onFinish() {
            if (this.mode === 'private-key' && this.meta.type !== 'private-key') {
                this.$emit('done')
                return
            }

            const m: M.Wallet.Meta = {
                ...this.meta as M.Wallet.Meta,
                backedUp: true
            }
            try {
                await this.$loading(
                    () => {
                        return this.$svc.wallet.update(this.walletId, m)
                    }
                )
            } catch {
                this.$q.notify({
                    type: 'negative',
                    message: this.$t('backup.msg_backup_save_failed').toString()
                })
                return
            }

            this.$emit('done')
        }
    }
})
</script>
