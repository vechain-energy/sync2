<template>
    <q-form
        class="column fit no-wrap"
        @submit="onCheck"
    >
        <page-toolbar
            :title="$t('domains.title')"
            :gid="selectedWallet && selectedWallet.gid"
        />
        <page-content
            padding
            class="col"
            innerClass="q-gutter-md"
        >
            <q-input
                outlined
                v-model.trim="inputName"
                :label="$t('domains.label_name')"
                suffix=".vet"
                autocomplete="off"
                spellcheck="false"
                :disable="!!commitment"
                :error="!!errors.name"
                :error-message="errors.name"
                no-error-icon
                @input="onInputChanged"
            />
            <q-input
                outlined
                v-model.number="years"
                type="number"
                min="1"
                step="1"
                :label="$t('domains.label_years')"
                :disable="!!commitment"
                :error="!!errors.years"
                :error-message="errors.years"
                no-error-icon
                @input="onInputChanged"
            />
            <q-select
                outlined
                emit-value
                map-options
                :disable="!!commitment"
                v-model="selectedAddress"
                :options="addressOptions"
                :label="$t('domains.label_owner')"
                :error="!!errors.owner"
                :error-message="errors.owner"
                no-error-icon
                @input="onInputChanged"
            />
            <q-banner
                v-if="statusText"
                :class="statusClass"
            >
                {{statusText}}
            </q-banner>
            <q-list
                v-if="info"
                bordered
                separator
            >
                <q-item>
                    <q-item-section>{{$t('domains.label_status')}}</q-item-section>
                    <q-item-section side>
                        <q-badge
                            :color="info.available ? 'positive' : 'negative'"
                            :label="info.available ? $t('domains.label_available') : $t('domains.label_unavailable')"
                        />
                    </q-item-section>
                </q-item>
                <q-item>
                    <q-item-section>{{$t('domains.label_cost')}}</q-item-section>
                    <q-item-section side>
                        <span>
                            <amount-label
                                :value="price"
                                :decimals="18"
                                :fixed="2"
                            /> VET
                        </span>
                    </q-item-section>
                </q-item>
                <q-item>
                    <q-item-section>{{$t('domains.label_network')}}</q-item-section>
                    <q-item-section side>{{$netDisplayName(selectedWallet.gid)}}</q-item-section>
                </q-item>
                <q-item v-if="commitment">
                    <q-item-section>{{$t('domains.label_wait')}}</q-item-section>
                    <q-item-section side>{{waitText}}</q-item-section>
                </q-item>
            </q-list>
            <q-banner
                v-if="commitment"
                class="bg-orange-1 text-deep-orange"
            >
                {{$t('domains.msg_keep_open')}}
            </q-banner>
        </page-content>
        <page-action>
            <q-btn
                type="submit"
                outline
                color="primary"
                :disable="!!commitment"
                :loading="checking"
                :label="$t('domains.action_check')"
            />
            <q-btn
                v-if="!commitment"
                unelevated
                color="primary"
                :disable="!canCommit"
                :loading="committing"
                :label="$t('domains.action_commit')"
                @click="onCommit"
            />
            <q-btn
                v-else
                unelevated
                color="primary"
                :disable="!canRegister"
                :loading="registering"
                :label="$t('domains.action_register')"
                @click="onRegister"
            />
        </page-action>
    </q-form>
</template>
<script lang="ts">
import Vue from 'vue'
import { randomBytes } from 'crypto'
import AmountLabel from 'src/components/AmountLabel.vue'
import PageAction from 'src/components/PageAction.vue'
import PageContent from 'src/components/PageContent.vue'
import PageToolbar from 'src/components/PageToolbar.vue'
import {
    VetDomainCommitmentParams,
    VetDomainContracts,
    VetDomainPrice,
    VetDomainRegistrationInfo,
    buildVetDomainCommitClause,
    buildVetDomainRegisterClause,
    decodedBoolean,
    decodedNumber,
    decodedString,
    decodedVetDomainPrice,
    getVetDomainContracts,
    isBasicRegistrationName,
    normalizeRegistrationName,
    sumVetDomainPrice,
    vetDomainAvailableABI,
    vetDomainCommitmentArgs,
    vetDomainMakeCommitmentABI,
    vetDomainMaxCommitmentAgeABI,
    vetDomainMinCommitmentAgeABI,
    vetDomainRentPriceABI,
    vetDomainValidABI,
    yearsToDuration
} from 'src/utils/vet-domain-registration'

type AddressOption = {
    label: string
    value: string
    walletId: number
}

type CommitState = {
    commitment: string
    params: VetDomainCommitmentParams
    price: VetDomainPrice
    createdAt: number
    minAge: number
    maxAge: number
}

type DomainErrors = {
    name: string
    years: string
    owner: string
}

type DomainData = {
    inputName: string
    years: number
    selectedAddress: string
    wallets: M.Wallet[]
    info: VetDomainRegistrationInfo | null
    errors: DomainErrors
    checking: boolean
    committing: boolean
    registering: boolean
    statusText: string
    statusClass: string
    commitState: CommitState | null
    now: number
    timer: number
    lookupTimer: number
}

export default Vue.extend({
    components: { AmountLabel, PageAction, PageContent, PageToolbar },
    data(): DomainData {
        return {
            inputName: '',
            years: 1,
            selectedAddress: '',
            wallets: [] as M.Wallet[],
            info: null as null | VetDomainRegistrationInfo,
            errors: {
                name: '',
                years: '',
                owner: ''
            },
            checking: false,
            committing: false,
            registering: false,
            statusText: '',
            statusClass: '',
            commitState: null as CommitState | null,
            now: Date.now(),
            timer: 0,
            lookupTimer: 0
        }
    },
    computed: {
        addressOptions(): AddressOption[] {
            return this.wallets.reduce<AddressOption[]>((items, wallet) => {
                return items.concat(wallet.meta.addresses.map((addr, index) => {
                    return {
                        label: `${wallet.meta.name} #${index + 1} - ${addr.slice(0, 10)}...${addr.slice(-8)}`,
                        value: addr,
                        walletId: wallet.id
                    }
                }))
            }, [])
        },
        selectedWallet(): M.Wallet | null {
            return this.wallets.find(wallet => wallet.meta.addresses.includes(this.selectedAddress)) || this.wallets[0] || null
        },
        normalizedName(): string {
            return normalizeRegistrationName(this.inputName)
        },
        contracts(): VetDomainContracts | null {
            const wallet = this.wallets.find(item => item.meta.addresses.includes(this.selectedAddress)) || this.wallets[0] || null
            return wallet ? getVetDomainContracts(wallet.gid) : null
        },
        price(): string {
            return this.info ? sumVetDomainPrice(this.info.price) : '0'
        },
        commitment(): string {
            return this.commitState ? this.commitState.commitment : ''
        },
        waitSeconds(): number {
            if (!this.commitState) {
                return 0
            }
            const elapsed = Math.floor((this.now - this.commitState.createdAt) / 1000)
            return Math.max(this.commitState.minAge - elapsed, 0)
        },
        expired(): boolean {
            if (!this.commitState) {
                return false
            }
            const elapsed = Math.floor((this.now - this.commitState.createdAt) / 1000)
            return elapsed > this.commitState.maxAge
        },
        waitText(): string {
            if (this.expired) {
                return this.$t('domains.label_expired').toString()
            }
            return this.waitSeconds > 0
                ? this.$t('domains.msg_wait_seconds', { seconds: this.waitSeconds }).toString()
                : this.$t('domains.label_ready').toString()
        },
        canCommit(): boolean {
            return !!this.info && this.info.valid && this.info.available && !!this.contracts && !!this.selectedAddress
        },
        canRegister(): boolean {
            return !!this.commitState && this.waitSeconds === 0 && !this.expired
        }
    },
    watch: {
        addressOptions(options: AddressOption[]) {
            if (!this.selectedAddress && options.length > 0) {
                this.selectedAddress = options[0].value
                this.scheduleCheck()
            }
        }
    },
    async mounted() {
        this.timer = window.setInterval(() => {
            this.now = Date.now()
        }, 1000)
        this.wallets = await this.$svc.wallet.all()
        this.ensureSelectedAddress()
        this.scheduleCheck()
    },
    beforeDestroy() {
        window.clearInterval(this.timer)
        window.clearTimeout(this.lookupTimer)
    },
    methods: {
        ensureSelectedAddress() {
            if (!this.selectedAddress && this.addressOptions.length > 0) {
                this.selectedAddress = this.addressOptions[0].value
            }
        },
        scheduleCheck() {
            window.clearTimeout(this.lookupTimer)
            if (this.commitment || !this.inputName.trim()) {
                return
            }
            this.lookupTimer = window.setTimeout(() => {
                void this.onCheck()
            }, 650)
        },
        onInputChanged() {
            this.info = null
            this.commitState = null
            this.statusText = ''
            this.statusClass = ''
            this.errors.name = ''
            this.errors.years = ''
            this.errors.owner = ''
            this.scheduleCheck()
        },
        validateInputs(): boolean {
            this.errors.name = ''
            this.errors.years = ''
            this.errors.owner = ''

            if (!isBasicRegistrationName(this.inputName)) {
                this.errors.name = this.$t('domains.msg_invalid_name').toString()
            }
            if (!Number.isInteger(Number(this.years)) || Number(this.years) < 1) {
                this.errors.years = this.$t('domains.msg_invalid_years').toString()
            }
            if (!this.selectedWallet || !this.selectedAddress) {
                this.errors.owner = this.$t('domains.msg_select_owner').toString()
            } else if (!this.contracts) {
                this.errors.owner = this.$t('domains.msg_network_unsupported').toString()
            }
            return !this.errors.name && !this.errors.years && !this.errors.owner
        },
        async onCheck() {
            window.clearTimeout(this.lookupTimer)
            if (!this.validateInputs() || !this.selectedWallet || !this.contracts) {
                return
            }
            this.checking = true
            this.info = null
            this.statusText = ''
            try {
                const name = this.normalizedName
                const duration = yearsToDuration(Number(this.years))
                const selectedAddress = this.selectedAddress
                const selectedGid = this.selectedWallet.gid
                const controller = this.$svc.bc(this.selectedWallet.gid).thor.account(this.contracts.controller)
                const [available, valid, rentPrice, minAge, maxAge] = await Promise.all([
                    controller.method(vetDomainAvailableABI).call(name),
                    controller.method(vetDomainValidABI).call(name),
                    controller.method(vetDomainRentPriceABI).call(name, duration),
                    controller.method(vetDomainMinCommitmentAgeABI).call(),
                    controller.method(vetDomainMaxCommitmentAgeABI).call()
                ])
                const currentWallet = this.selectedWallet
                if (name !== this.normalizedName || selectedAddress !== this.selectedAddress || !currentWallet || selectedGid !== currentWallet.gid) {
                    return
                }
                this.info = {
                    name,
                    duration,
                    available: decodedBoolean(available.decoded),
                    valid: decodedBoolean(valid.decoded),
                    minCommitmentAge: decodedNumber(minAge.decoded),
                    maxCommitmentAge: decodedNumber(maxAge.decoded),
                    price: decodedVetDomainPrice(rentPrice.decoded)
                }
                this.statusText = this.info.available
                    ? this.$t('domains.msg_available').toString()
                    : this.$t('domains.msg_unavailable').toString()
                this.statusClass = this.info.available ? 'bg-green-1 text-positive' : 'bg-red-1 text-negative'
            } catch (err) {
                this.info = null
                this.statusText = err.message || this.$t('common.something_wrong').toString()
                this.statusClass = 'bg-red-1 text-negative'
            } finally {
                this.checking = false
            }
        },
        async makeCommitment(params: VetDomainCommitmentParams): Promise<string> {
            if (!this.selectedWallet || !this.contracts) {
                throw new Error(this.$t('domains.msg_select_owner').toString())
            }
            const output = await this.$svc.bc(this.selectedWallet.gid).thor
                .account(this.contracts.controller)
                .method(vetDomainMakeCommitmentABI)
                .call(...vetDomainCommitmentArgs(params))
            return decodedString(output.decoded, 'commitment')
        },
        async onCommit() {
            if (!this.canCommit || !this.selectedWallet || !this.contracts || !this.info) {
                return
            }
            this.committing = true
            try {
                const params: VetDomainCommitmentParams = {
                    name: this.info.name,
                    owner: this.selectedAddress,
                    duration: this.info.duration,
                    secret: '0x' + randomBytes(32).toString('hex'),
                    resolver: this.contracts.resolver
                }
                const commitment = await this.makeCommitment(params)
                await this.$signTx(this.selectedWallet.gid, {
                    message: [buildVetDomainCommitClause(this.contracts, commitment)],
                    options: {
                        signer: this.selectedAddress,
                        comment: this.$t('domains.comment_commit', { name: `${params.name}.vet` }).toString()
                    }
                })
                this.commitState = {
                    commitment,
                    params,
                    price: this.info.price,
                    createdAt: Date.now(),
                    minAge: this.info.minCommitmentAge,
                    maxAge: this.info.maxCommitmentAge
                }
                this.statusText = this.$t('domains.msg_committed').toString()
                this.statusClass = 'bg-orange-1 text-deep-orange'
            } catch (err) {
                this.statusText = err.message || this.$t('common.something_wrong').toString()
                this.statusClass = 'bg-red-1 text-negative'
            } finally {
                this.committing = false
            }
        },
        async onRegister() {
            if (!this.commitState || !this.selectedWallet || !this.contracts) {
                return
            }
            this.registering = true
            try {
                await this.onCheck()
                if (!this.info || !this.info.available) {
                    throw new Error(this.$t('domains.msg_unavailable').toString())
                }
                await this.$signTx(this.selectedWallet.gid, {
                    message: [buildVetDomainRegisterClause(this.contracts, this.commitState.params, this.info.price)],
                    options: {
                        signer: this.selectedAddress,
                        comment: this.$t('domains.comment_register', { name: `${this.commitState.params.name}.vet` }).toString()
                    }
                })
                this.statusText = this.$t('domains.msg_submitted').toString()
                this.statusClass = 'bg-green-1 text-positive'
                this.commitState = null
                this.info = null
            } catch (err) {
                this.statusText = err.message || this.$t('common.something_wrong').toString()
                this.statusClass = 'bg-red-1 text-negative'
            } finally {
                this.registering = false
            }
        }
    }
})
</script>
