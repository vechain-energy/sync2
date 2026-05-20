<template>
    <q-dialog
        ref="dialog"
        @hide="$emit('hide')"
        :position="$q.screen.xs ? 'bottom': 'standard'"
        :no-backdrop-dismiss="!$q.screen.xs"
    >
        <q-card class="full-width">
            <prompt-dialog-toolbar>{{$t('newWallet.action_import')}}</prompt-dialog-toolbar>
            <q-tabs
                v-model="state.tab"
                dense
                active-color="primary"
                indicator-color="primary"
            >
                <q-tab
                    name="mnemonic"
                    :label="$t('newWallet.action_import_mnemonic')"
                />
                <q-tab
                    name="private-key"
                    :label="$t('newWallet.action_import_private_key')"
                />
            </q-tabs>
            <q-separator />
            <q-tab-panels
                v-model="state.tab"
                animated
            >
                <q-tab-panel
                    name="mnemonic"
                    class="q-pa-none"
                >
                    <q-card-section>
                        <q-input
                            ref="input"
                            autofocus
                            v-model="state.words"
                            :label="$t('newWallet.label_mnemonic')"
                            type="textarea"
                            outlined
                            :error="!!error"
                            :error-message="error"
                            no-error-icon
                        />
                        <q-expansion-item :label="$t('newWallet.label_advance')" dense>
                            <q-card class="q-gutter-sm">
                                <q-card-section>
                                    <q-option-group class="q-mb-md" dense @update:model-value="onPathTypeChange" inline v-model="pathType" :options="options" />
                                    <q-input
                                        outlined
                                        v-model.trim="state.path"
                                        :label= "$t('newWallet.label_path')"
                                        stack-label
                                        :readonly="pathType !== 'custom'"
                                        type="text"
                                        ref="inputPath"
                                        :prefix="prefix"
                                        :error="!!pathError"
                                        :error-message="pathError"
                                        placeholder="0'/0'/0"
                                        :hint=" pathType === 'custom' ? `${this.$t('newWallet.msg_example')}: m/44'/818'/0'/0` : '' ">
                                    </q-input>
                                </q-card-section>
                            </q-card>
                        </q-expansion-item>
                    </q-card-section>
                </q-tab-panel>
                <q-tab-panel
                    name="private-key"
                    class="q-pa-none"
                >
                    <q-card-section>
                        <q-banner class="bg-red-1 text-negative q-mb-md">
                            {{$t('newWallet.msg_private_key_warning')}}
                        </q-banner>
                        <q-input
                            ref="privateKeyInput"
                            autofocus
                            outlined
                            v-model.trim="state.privateKey"
                            :label="$t('newWallet.label_private_key')"
                            :type="privateKeyVisible ? 'text' : 'password'"
                            autocomplete="off"
                            spellcheck="false"
                            :error="!!privateKeyError"
                            :error-message="privateKeyError"
                            no-error-icon
                        >
                            <template v-slot:append>
                                <q-icon
                                    class="cursor-pointer"
                                    :name="privateKeyVisible ? 'visibility_off' : 'visibility'"
                                    @click="privateKeyVisible = !privateKeyVisible"
                                />
                            </template>
                        </q-input>
                    </q-card-section>
                </q-tab-panel>
            </q-tab-panels>
            <q-card-actions>
                <q-btn
                    v-disableFocusHelper
                    class="w40 q-mx-auto"
                    unelevated
                    color="primary"
                    :label="$t('common.ok')"
                    @click="onSubmit()"
                />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { QDialog } from 'quasar'
import { mnemonic } from 'thor-devkit'
import PromptDialogToolbar from 'src/components/PromptDialogToolbar.vue'
import { parsePrivateKey } from 'src/utils/private-key'
import { ImportResult, ImportState } from './import-types'

// eslint-disable-next-line quotes
const VET_DERIVATION_PATH = `818'/0'/0`
// eslint-disable-next-line quotes
const ETH_DERIVATION_PATH = `60'/0'/0`
// eslint-disable-next-line quotes
const PREFIX = `m/44'/`

export default defineComponent({
    components: { PromptDialogToolbar },
    props: {
        state: Object as () => ImportState
    },
    data: () => {
        return {
            paths: {
                vet: VET_DERIVATION_PATH,
                eth: ETH_DERIVATION_PATH,
                custom: ''
            },
            prefix: PREFIX,
            pathType: 'vet' as 'vet' | 'eth' | 'custom',
            options: null as unknown as { label: string, value: string }[],
            error: '',
            pathError: '',
            privateKeyError: '',
            privateKeyVisible: false
        }
    },
    watch: {
        'state.words'() {
            this.error = ''
        },
        'state.path'() {
            this.pathError = ''
        },
        'state.privateKey'() {
            this.privateKeyError = ''
        }
    },
    unmounted() {
        this.state.words = ''
        this.state.path = ''
        this.state.privateKey = ''
        this.state.tab = 'mnemonic'
    },
    created() {
        this.state.tab = this.state.tab || 'mnemonic'
        this.state.path = VET_DERIVATION_PATH
        this.options = [
            {
                label: this.$t('newWallet.action_vet_path').toString(),
                value: 'vet'
            },
            {
                label: this.$t('newWallet.action_eth_path').toString(),
                value: 'eth'
            },
            {
                label: this.$t('newWallet.action_custom_path').toString(),
                value: 'custom'
            }
        ]
    },
    methods: {
        // method is REQUIRED by $q.dialog
        show() { (this.$refs.dialog as QDialog).show() },
        // method is REQUIRED by $q.dialog
        hide() { (this.$refs.dialog as QDialog).hide() },
        ok(result: ImportResult) {
            this.$emit('ok', result)
            this.hide()
        },
        onPathTypeChange(v: 'vet' | 'eth' | 'custom') {
            if (v === 'custom') {
                this.state.path = ''
                const input = (this.$refs.inputPath as Vue).$el.getElementsByTagName('input')[0]
                this.$nextTick(
                    () => {
                        input.focus()
                    }
                )
            } else {
                this.state.path = this.paths[v]
            }
        },
        async onSubmit() {
            if (this.state.tab === 'private-key') {
                await this.onSubmitPrivateKey()
            } else {
                await this.onSubmitMnemonic()
            }
        },
        async onSubmitMnemonic() {
            const inputEl = (this.$refs.input as Vue).$el.getElementsByTagName('textarea')[0]
            inputEl.focus()

            const words = this.state.words
                .trim()
                .toLowerCase()

            if (words.length < 1) {
                return
            }

            this.error = ''
            await this.$nextTick()

            try {
                const reg = /^m\/44'\/\d+'\/\d+'(\/\d+)?$/
                const array = words.split(/\s+/)
                if (array.length < 12 || !mnemonic.validate(array)) {
                    throw new Error('m')
                }

                if (!reg.test(PREFIX + this.state.path)) {
                    throw new Error('p')
                }

                this.ok({ type: 'mnemonic', words: array, path: PREFIX + this.state.path })
            } catch (error) {
                if (error.message === 'm') {
                    this.error = this.$t('newWallet.msg_mnemonic_error').toString()
                } else if (error.message === 'p') {
                    this.pathError = this.$t('newWallet.msg_invalid_path').toString()
                }
            }
        },
        async onSubmitPrivateKey() {
            const inputEl = (this.$refs.privateKeyInput as Vue).$el.getElementsByTagName('input')[0]
            inputEl.focus()

            if (this.state.privateKey.trim().length < 1) {
                return
            }

            this.privateKeyError = ''
            await this.$nextTick()

            try {
                this.ok({
                    type: 'private-key',
                    privateKey: parsePrivateKey(this.state.privateKey)
                })
            } catch {
                this.privateKeyError = this.$t('newWallet.msg_private_key_error').toString()
            }
        }
    }
})
</script>
