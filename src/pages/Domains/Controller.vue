<template>
    <div class="column fit no-wrap">
        <page-toolbar
            :title="confirmation ? $t('domains.title_confirmation') : $t('domains.title')"
            :gid="confirmation ? confirmation.gid : selectedWallet && selectedWallet.gid"
        />
        <template v-if="confirmation">
            <page-content
                padding
                class="col"
                innerClass="q-gutter-md"
            >
                <div class="text-center q-py-lg">
                    <q-icon
                        name="check_circle_outline"
                        color="positive"
                        size="4rem"
                    />
                    <div class="text-h5 q-mt-md">{{confirmation.name}}</div>
                    <div class="text-grey-7">{{$t('domains.msg_registration_confirmed')}}</div>
                </div>
                <q-banner
                    v-if="confirmation.primary"
                    class="bg-orange-1 text-deep-orange"
                >
                    {{$t('domains.msg_primary_confirmed', { name: confirmation.name })}}
                </q-banner>
                <q-list
                    bordered
                    separator
                >
                    <q-item>
                        <q-item-section>{{$t('domains.label_status')}}</q-item-section>
                        <q-item-section side>{{$t('domains.label_submitted')}}</q-item-section>
                    </q-item>
                    <q-item>
                        <q-item-section>{{$t('domains.label_owner')}}</q-item-section>
                        <q-item-section side>
                            <address-label
                                :addr="confirmation.owner"
                                :gid="confirmation.gid"
                                full
                            />
                        </q-item-section>
                    </q-item>
                    <q-item>
                        <q-item-section>{{$t('domains.label_transaction')}}</q-item-section>
                        <q-item-section side>{{confirmation.txid.slice(0, 10)}}...{{confirmation.txid.slice(-8)}}</q-item-section>
                    </q-item>
                </q-list>
            </page-content>
            <page-action>
                <q-btn
                    outline
                    color="primary"
                    :label="$t('activities.title')"
                    @click="$router.push({name: 'activities'})"
                />
                <q-btn
                    unelevated
                    color="primary"
                    :label="$t('common.finish')"
                    @click="resetAfterConfirmation"
                />
            </page-action>
        </template>
        <q-form
            v-else
            class="column fit no-wrap"
            @submit="onCheck"
        >
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
                    @update:model-value="onInputChanged"
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
                    @update:model-value="onInputChanged"
                />
                <q-checkbox
                    v-model="setAsPrimary"
                    :true-value="true"
                    :false-value="false"
                    :disable="!!commitment"
                    :label="$t('domains.label_set_primary')"
                    @update:model-value="onPrimaryChanged"
                />
                <q-banner
                    v-if="statusText"
                    :class="statusClass"
                >
                    {{statusText}}
                </q-banner>
                <transition name="domain-result-fade">
                    <q-list
                        v-if="checking || info"
                        bordered
                        separator
                    >
                        <q-item>
                            <q-item-section>{{$t('domains.label_status')}}</q-item-section>
                            <q-item-section side>
                                <q-spinner-dots
                                    v-if="checking && !info"
                                    color="primary"
                                />
                                <q-badge
                                    v-else-if="info"
                                    :color="info.available ? 'positive' : 'negative'"
                                    :label="info.available ? $t('domains.label_available') : $t('domains.label_unavailable')"
                                />
                            </q-item-section>
                        </q-item>
                        <q-item v-if="info">
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
                        <q-item v-if="info && networkDisplayName">
                            <q-item-section>{{$t('domains.label_network')}}</q-item-section>
                            <q-item-section side>{{networkDisplayName}}</q-item-section>
                        </q-item>
                        <q-item v-if="commitment">
                            <q-item-section>{{$t('domains.label_wait')}}</q-item-section>
                            <q-item-section side>{{waitText}}</q-item-section>
                        </q-item>
                    </q-list>
                </transition>
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
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { randomBytes } from 'crypto'
import AmountLabel from 'src/components/AmountLabel.vue'
import AddressLabel from 'src/components/AddressLabel.vue'
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
    vetDomainFullName,
    vetDomainMakeCommitmentABI,
    vetDomainMaxCommitmentAgeABI,
    vetDomainMinCommitmentAgeABI,
    vetDomainRentPriceABI,
    vetDomainValidABI,
    yearsToDuration
} from 'src/utils/vet-domain-registration'
import {
    findVetDomainWallet,
    resolveVetDomainAddress
} from 'src/utils/vet-domain-wallet-selection'
import { dialogErrorMessage } from 'src/utils/dialog-error'
import { parseStoredNonNegativeInteger } from 'src/utils/storage'

const SELECTED_WALLET_ID_KEY = 'selectedWalletId'

type CommitState = {
    commitment: string
    params: VetDomainCommitmentParams
    price: VetDomainPrice
    createdAt: number
    minAge: number
    maxAge: number
}

type ConfirmationState = {
    gid: string
    name: string
    owner: string
    primary: boolean
    txid: string
}

type DomainErrors = {
    name: string
    years: string
    wallet: string
    owner: string
}

type DomainData = {
    inputName: string
    years: number
    setAsPrimary: boolean
    selectedWalletId: number
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
    confirmation: ConfirmationState | null
    now: number
    timer: number
    lookupTimer: number
}

export default defineComponent({
    components: { AddressLabel, AmountLabel, PageAction, PageContent, PageToolbar },
    data(): DomainData {
        return {
            inputName: '',
            years: 1,
            setAsPrimary: true,
            selectedWalletId: parseStoredNonNegativeInteger(localStorage.getItem(SELECTED_WALLET_ID_KEY)),
            selectedAddress: '',
            wallets: [] as M.Wallet[],
            info: null as null | VetDomainRegistrationInfo,
            errors: {
                name: '',
                years: '',
                wallet: '',
                owner: ''
            },
            checking: false,
            committing: false,
            registering: false,
            statusText: '',
            statusClass: '',
            commitState: null as CommitState | null,
            confirmation: null as ConfirmationState | null,
            now: Date.now(),
            timer: 0,
            lookupTimer: 0
        }
    },
    computed: {
        selectedWallet(): M.Wallet | null {
            return findVetDomainWallet(this.wallets, this.selectedWalletId)
        },
        normalizedName(): string {
            return normalizeRegistrationName(this.inputName)
        },
        contracts(): VetDomainContracts | null {
            return this.selectedWallet ? getVetDomainContracts(this.selectedWallet.gid) : null
        },
        price(): string {
            return this.info ? sumVetDomainPrice(this.info.price) : '0'
        },
        networkDisplayName(): string {
            return this.selectedWallet ? this.$netDisplayName(this.selectedWallet.gid) : ''
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
    async mounted() {
        this.timer = window.setInterval(() => {
            this.now = Date.now()
        }, 1000)
        this.wallets = await this.$svc.wallet.all()
        this.ensureSelectedWallet()
        this.ensureSelectedAddress()
        this.scheduleCheck()
    },
    beforeUnmount() {
        window.clearInterval(this.timer)
        window.clearTimeout(this.lookupTimer)
    },
    methods: {
        ensureSelectedWallet() {
            const wallet = this.wallets.find(item => item.id === this.selectedWalletId) || this.wallets[0] || null
            if (wallet && wallet.id !== this.selectedWalletId) {
                this.selectedWalletId = wallet.id
                localStorage.setItem(SELECTED_WALLET_ID_KEY, this.selectedWalletId.toString())
            }
        },
        ensureSelectedAddress() {
            this.selectedAddress = resolveVetDomainAddress(this.selectedWallet, this.selectedAddress)
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
            this.errors.wallet = ''
            this.errors.owner = ''
            this.scheduleCheck()
        },
        onPrimaryChanged() {
            this.commitState = null
        },
        walletSigners(): string[] {
            const selectedWallet = this.selectedWallet
            if (!selectedWallet || !this.selectedAddress) {
                return []
            }
            const networkAddresses = this.wallets.reduce<string[]>((items, wallet) => {
                return wallet.gid === selectedWallet.gid
                    ? items.concat(wallet.meta.addresses)
                    : items
            }, [])
            return [
                this.selectedAddress,
                ...networkAddresses.filter(addr => addr.toLowerCase() !== this.selectedAddress.toLowerCase())
            ]
        },
        resetAfterConfirmation() {
            this.confirmation = null
            this.inputName = ''
            this.info = null
            this.commitState = null
            this.statusText = ''
            this.statusClass = ''
            this.scheduleCheck()
        },
        validateInputs(): boolean {
            this.errors.name = ''
            this.errors.years = ''
            this.errors.wallet = ''
            this.errors.owner = ''

            if (!isBasicRegistrationName(this.inputName)) {
                this.errors.name = this.$t('domains.msg_invalid_name').toString()
            }
            if (!Number.isInteger(Number(this.years)) || Number(this.years) < 1) {
                this.errors.years = this.$t('domains.msg_invalid_years').toString()
            }
            if (!this.selectedWallet) {
                this.errors.wallet = this.$t('domains.msg_select_wallet').toString()
            } else if (!this.selectedAddress) {
                this.errors.owner = this.$t('domains.msg_select_owner').toString()
            } else if (!this.contracts) {
                this.errors.owner = this.$t('domains.msg_network_unsupported').toString()
            }
            const hiddenSelectionError = this.errors.wallet || this.errors.owner
            if (hiddenSelectionError) {
                this.statusText = hiddenSelectionError
                this.statusClass = 'bg-red-1 text-negative'
            }
            return !this.errors.name && !this.errors.years && !this.errors.wallet && !this.errors.owner
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
                this.statusText = this.info.available ? '' : this.$t('domains.msg_unavailable').toString()
                this.statusClass = this.info.available ? '' : 'bg-red-1 text-negative'
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
                    resolver: this.contracts.resolver,
                    setAsPrimary: this.setAsPrimary
                }
                const commitment = await this.makeCommitment(params)
                await this.$signTx(this.selectedWallet.gid, {
                    message: [buildVetDomainCommitClause(this.contracts, commitment)],
                    options: {
                        comment: this.$t('domains.comment_commit', { name: `${params.name}.vet` }).toString()
                    },
                    signers: this.walletSigners()
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
                const message = dialogErrorMessage(err, this.$t('common.something_wrong').toString())
                if (message) {
                    this.statusText = message
                    this.statusClass = 'bg-red-1 text-negative'
                }
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
                const wallet = this.selectedWallet
                const params = this.commitState.params
                await this.onCheck()
                if (!this.info || !this.info.available) {
                    throw new Error(this.$t('domains.msg_unavailable').toString())
                }
                const response = await this.$signTx(wallet.gid, {
                    message: [buildVetDomainRegisterClause(this.contracts, params, this.info.price)],
                    options: {
                        comment: this.$t('domains.comment_register', { name: vetDomainFullName(params.name) }).toString()
                    },
                    signers: this.walletSigners()
                })
                const fullName = vetDomainFullName(params.name)
                if (params.setAsPrimary) {
                    this.$svc.bc(wallet.gid).setVetDomainsPrimaryName(params.owner, fullName)
                }
                this.confirmation = {
                    gid: wallet.gid,
                    name: fullName,
                    owner: params.owner,
                    primary: params.setAsPrimary,
                    txid: response.txid
                }
                this.statusText = this.$t('domains.msg_submitted').toString()
                this.statusClass = 'bg-green-1 text-positive'
                this.commitState = null
                this.info = null
            } catch (err) {
                const message = dialogErrorMessage(err, this.$t('common.something_wrong').toString())
                if (message) {
                    this.statusText = message
                    this.statusClass = 'bg-red-1 text-negative'
                }
            } finally {
                this.registering = false
            }
        }
    }
})
</script>
<style scoped>
.domain-result-fade-enter-active,
.domain-result-fade-leave-active {
    transition: opacity 160ms ease;
}

.domain-result-fade-enter-from,
.domain-result-fade-leave-to {
    opacity: 0;
}
</style>
