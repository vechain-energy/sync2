<template>
    <q-input
        outlined
        no-error-icon
        autocomplete="off"
        v-bind="$attrs"
        dense
        placeholder="0x"
        :model-value="input"
        @update:model-value="onUpdateInput"
        spellcheck="false"
        :hint="resolvedHint"
    >
        <template
            v-if="isAddress(to)"
            v-slot:prepend
        >
            <AddressAvatar :addr="to" :gid="gid" />
        </template>
        <template v-slot:append>
            <button
                v-if="input"
                class="send-clear-btn q-field__focusable-action"
                type="button"
                aria-label="Clear"
                title="Clear"
                @mousedown.stop.prevent="clearInput"
                @click.stop.prevent="clearInput"
            >
                <q-icon name="cancel" />
            </button>
            <q-btn
                v-else-if="hasCamera"
                rounded
                dense
                icon="qr_code_scanner"
                flat
                :aria-label="$t('common.scan_qr_code').toString()"
                :title="$t('common.scan_qr_code').toString()"
                @click.stop="onClickScan"
            />
        </template>
        <q-popup-proxy
            :no-parent-event="!!to"
            position="bottom"
            fit
        >
            <q-card>
                <q-list padding>
                    <template
                        v-for="(group, gi) in wallets"
                        :key="gi"
                    >
                        <q-item-label
                            header
                        >
                            {{group.name}}
                        </q-item-label>
                        <template
                            v-for="(addr, ai) in group.list"
                            :key="`${gi}-${ai}`"
                        >
                            <AddressItem
                                clickable
                                v-close-popup
                                @click="onSelectAddress(addr)"
                                :address="addr"
                                :gid="gid"
                            />
                        </template>
                    </template>
                </q-list>
            </q-card>
        </q-popup-proxy>
    </q-input>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { address } from 'thor-devkit'
import AddressAvatar from 'src/components/AddressAvatar.vue'
import { AddressGroup } from './models'
import AddressItem from './AddressItem.vue'
import QrScannerDialog from 'pages/QrScannerDialog'
import { QrScanner } from 'src/utils/qr-scanner'
import { isVetDomainName, normalizeVetDomainName } from 'src/utils/vet-domains'

type InputValue = string | number | null

export default defineComponent({
    emits: ['update:modelValue', 'change'],
    components: {
        AddressAvatar,
        AddressItem
    },
    props: {
        wallets: {
            type: Array as () => AddressGroup[],
            default: []
        },
        modelValue: String,
        gid: String
    },
    data() {
        return {
            input: this.modelValue || '',
            clearButtonPressListener: null as ((ev: MouseEvent) => void) | null,
            clearButtonClickListener: null as ((ev: MouseEvent) => void) | null
        }
    },
    computed: {
        inputIsVetDomain(): boolean {
            return isVetDomainName(this.input || '')
        },
        to(): string {
            return this.inputIsVetDomain ? this.resolvedAddress || this.input : this.input || ''
        },
        resolvedHint(): string {
            if (this.inputIsVetDomain) {
                return this.resolvedAddress
            }
            return this.resolvedName
        }
    },
    asyncComputed: {
        hasCamera() {
            if (process.env.MODE === 'cordova') {
                // assume all mobile devices have camera
                return Promise.resolve(true)
            } else {
                return QrScanner.hasCamera()
            }
        },
        resolvedAddress: {
            async get(): Promise<string> {
                if (!this.gid || !this.inputIsVetDomain) {
                    return ''
                }
                const [resolvedAddress] = await this.$svc.bc(this.gid).vetDomainsAddressesOf([normalizeVetDomainName(this.input)])
                return resolvedAddress
            },
            default: ''
        },
        resolvedName: {
            async get(): Promise<string> {
                if (!this.gid || !address.test(this.input)) {
                    return ''
                }
                const [resolvedName] = await this.$svc.bc(this.gid).vetDomainsNamesOf([this.input])
                return resolvedName
            },
            default: ''
        }
    },
    watch: {
        modelValue(v: string) {
            if (v === this.resolvedAddress) {
                return
            }
            this.input = v
        },
        to(v: string) {
            this.$emit('update:modelValue', v)
            this.$emit('change', v)
        }
    },
    methods: {
        isAddress: address.test,
        isClearButtonEvent(ev: Event) {
            return ev.target instanceof Element && !!ev.target.closest('.send-clear-btn')
        },
        onClearButtonPress(ev: MouseEvent) {
            if (!this.isClearButtonEvent(ev)) {
                return
            }
            ev.preventDefault()
            ev.stopPropagation()
            this.clearInput()
        },
        onClearButtonClick(ev: MouseEvent) {
            if (!this.isClearButtonEvent(ev)) {
                return
            }
            ev.preventDefault()
            ev.stopPropagation()
            this.clearInput()
        },
        onUpdateInput(value: InputValue) {
            this.input = value === null ? '' : value.toString()
        },
        clearInput() {
            this.input = ''
            this.$emit('update:modelValue', '')
            this.$emit('change', '')
            this.$nextTick(() => {
                const input = (this.$el as HTMLElement).querySelector<HTMLInputElement>('input')
                if (input && input.value) {
                    input.value = ''
                    input.dispatchEvent(new Event('input', { bubbles: true }))
                }
            })
        },
        onSelectAddress(addr: string) {
            this.input = address.toChecksumed(addr)
        },
        async onClickScan() {
            try {
                this.input = await this.$dialog<string>({ component: QrScannerDialog })
            } catch { }
        }
    },
    mounted() {
        this.clearButtonPressListener = ev => this.onClearButtonPress(ev)
        this.clearButtonClickListener = ev => this.onClearButtonClick(ev)
        document.addEventListener('mousedown', this.clearButtonPressListener, true)
        document.addEventListener('click', this.clearButtonClickListener, true)
    },
    beforeUnmount() {
        if (this.clearButtonPressListener) {
            document.removeEventListener('mousedown', this.clearButtonPressListener, true)
        }
        if (this.clearButtonClickListener) {
            document.removeEventListener('click', this.clearButtonClickListener, true)
        }
    }
})
</script>
<style scoped>
.send-clear-btn {
    align-items: center;
    background: transparent;
    border: 0;
    color: currentColor;
    cursor: pointer;
    display: inline-flex;
    font: inherit;
    height: 32px;
    justify-content: center;
    margin: 0;
    outline: 0;
    padding: 0;
    width: 32px;
}
</style>
