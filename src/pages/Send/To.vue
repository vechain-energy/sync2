<template>
    <q-input
        outlined
        no-error-icon
        autocomplete="off"
        v-bind="$attrs"
        dense
        placeholder="0x"
        clearable
        v-model.lazy="input"
        spellcheck="false"
        :hint="resolvedHint"
    >
        <template
            v-if="isAddress(to)"
            v-slot:prepend
        >
            <AddressAvatar :addr="to" />
        </template>
        <template v-slot:append>
            <q-btn
                v-show="hasCamera && !input"
                rounded
                dense
                icon="qr_code_scanner"
                flat
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
                    <template v-for="(group, gi) in wallets">
                        <q-item-label
                            :key="gi"
                            header
                        >
                            {{group.name}}
                        </q-item-label>
                        <template v-for="(addr, ai) in group.list">
                            <AddressItem
                                clickable
                                v-close-popup
                                @click="onSelectAddress(addr)"
                                :key="`${gi} + ${ai}`"
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
import Vue from 'vue'
import { address } from 'thor-devkit'
import AddressAvatar from 'src/components/AddressAvatar.vue'
import { AddressGroup } from './models'
import AddressItem from './AddressItem.vue'
import QrScannerDialog from 'pages/QrScannerDialog'
import { QrScanner } from 'src/utils/qr-scanner'
import { isVetDomainName, normalizeVetDomainName } from 'src/utils/vet-domains'

export default Vue.extend({
    components: {
        AddressAvatar,
        AddressItem
    },
    model: {
        prop: 'address',
        event: 'change'
    },
    props: {
        wallets: {
            type: Array as () => AddressGroup[],
            default: []
        },
        address: String,
        gid: String
    },
    data() {
        return {
            input: this.address || ''
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
        address(v: string) {
            if (v === this.resolvedAddress) {
                return
            }
            this.input = v
        },
        to(v: string) {
            this.$emit('change', v)
        }
    },
    methods: {
        isAddress: address.test,
        onSelectAddress(addr: string) {
            this.input = address.toChecksumed(addr)
        },
        async onClickScan() {
            try {
                this.input = await this.$dialog<string>({ component: QrScannerDialog })
            } catch { }
        }
    }
})
</script>
