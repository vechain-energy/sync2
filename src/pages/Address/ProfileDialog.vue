<template>
    <q-dialog
        ref="dialog"
        @hide="$emit('hide')"
        :position="$q.screen.xs ? 'bottom': 'standard'"
        :no-backdrop-dismiss="saving"
    >
        <q-card class="full-width">
            <prompt-dialog-toolbar>{{$t('address.action_edit_vns_profile')}}</prompt-dialog-toolbar>
            <q-form @submit="onSubmit">
                <q-card-section
                    v-if="loading"
                    class="text-center q-pa-xl"
                >
                    <q-spinner color="primary" size="2rem" />
                </q-card-section>
                <q-card-section
                    v-else
                    class="q-gutter-md"
                >
                    <q-banner class="bg-orange-1 text-deep-orange">
                        {{$t('address.msg_vns_profile_warning', { name })}}
                    </q-banner>
                    <q-banner
                        v-if="error"
                        class="bg-red-1 text-negative"
                    >
                        {{error}}
                    </q-banner>
                    <div class="column items-center q-gutter-sm">
                        <q-avatar size="6rem">
                            <img
                                :src="avatarSrc"
                                :alt="profile.display || name"
                                @error="onAvatarError"
                            />
                        </q-avatar>
                        <div class="row q-gutter-sm">
                            <q-btn
                                outline
                                color="primary"
                                icon="add_a_photo"
                                :label="$t('address.action_vns_profile_avatar')"
                                :disable="saving"
                                @click="selectAvatar"
                            />
                            <q-btn
                                v-if="hasAvatar"
                                flat
                                color="negative"
                                :label="$t('address.action_vns_profile_remove_avatar')"
                                :disable="saving"
                                @click="removeAvatar"
                            />
                        </div>
                        <input
                            ref="avatarInput"
                            class="hidden-input"
                            type="file"
                            accept="image/*"
                            @change="onAvatarSelected"
                        >
                    </div>
                    <q-input
                        outlined
                        v-model="profile.display"
                        :maxlength="25"
                        :label="$t('address.label_vns_profile_display')"
                        :error="!!displayError"
                        :error-message="displayError"
                        :disable="saving"
                        no-error-icon
                    />
                    <q-input
                        outlined
                        type="textarea"
                        v-model="profile.description"
                        :maxlength="100"
                        :label="$t('address.label_vns_profile_description')"
                        :error="!!descriptionError"
                        :error-message="descriptionError"
                        :disable="saving"
                        no-error-icon
                    />
                    <q-input
                        outlined
                        type="email"
                        v-model="profile.email"
                        :label="$t('address.label_vns_profile_email')"
                        :disable="saving"
                        no-error-icon
                    />
                    <q-input
                        outlined
                        v-model="profile.url"
                        :label="$t('address.label_vns_profile_url')"
                        :error="!!urlError"
                        :error-message="urlError"
                        :disable="saving"
                        no-error-icon
                    />
                    <q-input
                        outlined
                        v-model="profile['com.x']"
                        prefix="@"
                        :label="$t('address.label_vns_profile_x')"
                        :disable="saving"
                        no-error-icon
                    />
                </q-card-section>
                <q-card-actions align="between">
                    <q-btn
                        flat
                        color="primary"
                        :label="$t('common.cancel')"
                        :disable="saving"
                        @click="hide"
                    />
                    <q-btn
                        unelevated
                        color="primary"
                        type="submit"
                        :label="$t('common.confirm')"
                        :loading="saving"
                        :disable="loading || !canSave"
                    />
                </q-card-actions>
            </q-form>
        </q-card>
    </q-dialog>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { QDialog } from 'quasar'
import { picasso } from '@vechain/picasso'
import PromptDialogToolbar from 'src/components/PromptDialogToolbar.vue'
import {
    VetDomainProfile,
    buildVetDomainProfileUpdateClauses,
    changedVetDomainProfileRecords,
    convertVetDomainProfileUriToUrl,
    emptyVetDomainProfile,
    isHttpUrl,
    normalizeVetDomainProfile,
    prepareVetDomainProfileAvatar,
    uploadVetDomainProfileAvatar,
    vetDomainProfileTransactionComment
} from 'src/utils/vet-domain-profile'

export default defineComponent({
    components: { PromptDialogToolbar },
    props: {
        wallet: Object as () => M.Wallet,
        address: String,
        name: String
    },
    data() {
        return {
            loading: false,
            saving: false,
            error: '',
            profile: emptyVetDomainProfile(),
            initialProfile: emptyVetDomainProfile(),
            avatarFile: null as File | null,
            avatarPreviewUrl: '',
            failedAvatarSrc: ''
        }
    },
    computed: {
        displayError(): string {
            return this.profile.display.length > 25 ? this.$t('address.msg_vns_profile_display_error').toString() : ''
        },
        descriptionError(): string {
            return this.profile.description.length > 100 ? this.$t('address.msg_vns_profile_description_error').toString() : ''
        },
        urlError(): string {
            const value = this.profile.url.trim()
            return value && !isHttpUrl(value) ? this.$t('address.msg_vns_profile_url_error').toString() : ''
        },
        avatarSrc(): string {
            if (this.avatarPreviewUrl && this.avatarPreviewUrl !== this.failedAvatarSrc) {
                return this.avatarPreviewUrl
            }
            const avatarUrl = convertVetDomainProfileUriToUrl(this.profile.avatar, this.wallet.gid)
            if (avatarUrl && avatarUrl !== this.failedAvatarSrc) {
                return avatarUrl
            }
            return this.address ? `data:image/svg+xml;utf8,${picasso(this.address.toLowerCase())}` : ''
        },
        hasAvatar(): boolean {
            return !!this.avatarFile || !!this.profile.avatar
        },
        canSave(): boolean {
            return !this.displayError && !this.descriptionError && !this.urlError && this.hasChanges
        },
        hasChanges(): boolean {
            return changedVetDomainProfileRecords(this.initialProfile, this.profile).length > 0 || !!this.avatarFile
        }
    },
    async mounted() {
        await this.loadProfile()
    },
    beforeUnmount() {
        this.revokeAvatarPreviewUrl()
    },
    methods: {
        show() { (this.$refs.dialog as QDialog).show() },
        hide() { (this.$refs.dialog as QDialog).hide() },
        ok() {
            this.$emit('ok')
            this.hide()
        },
        async loadProfile() {
            this.loading = true
            this.error = ''
            try {
                const profile = await this.$svc.bc(this.wallet.gid).vetDomainProfileOf(this.name)
                this.initialProfile = normalizeVetDomainProfile(profile)
                this.profile = normalizeVetDomainProfile(profile)
            } catch (err) {
                console.warn('load VNS profile:', err)
                this.error = this.$t('address.msg_vns_profile_load_error').toString()
            } finally {
                this.loading = false
            }
        },
        selectAvatar() {
            const input = this.$refs.avatarInput as HTMLInputElement
            input.click()
        },
        onAvatarSelected(event: Event) {
            const input = event.target as HTMLInputElement
            const file = input.files && input.files[0]
            if (!file) {
                return
            }
            this.revokeAvatarPreviewUrl()
            this.avatarFile = file
            this.avatarPreviewUrl = URL.createObjectURL(file)
            this.failedAvatarSrc = ''
            input.value = ''
        },
        removeAvatar() {
            this.revokeAvatarPreviewUrl()
            this.avatarFile = null
            this.profile.avatar = ''
            this.failedAvatarSrc = ''
        },
        revokeAvatarPreviewUrl() {
            if (this.avatarPreviewUrl) {
                URL.revokeObjectURL(this.avatarPreviewUrl)
                this.avatarPreviewUrl = ''
            }
        },
        onAvatarError() {
            this.failedAvatarSrc = this.avatarSrc
        },
        async signers(): Promise<string[]> {
            const wallets = await this.$svc.wallet.getByGid(this.wallet.gid)
            const addresses = wallets.reduce<string[]>((items, wallet) => {
                return items.concat(wallet.meta.addresses)
            }, [])
            return [
                this.address,
                ...addresses.filter(addr => addr.toLowerCase() !== this.address.toLowerCase())
            ]
        },
        async buildNextProfile(): Promise<VetDomainProfile> {
            const nextProfile = normalizeVetDomainProfile(this.profile)
            if (this.avatarFile) {
                const avatar = await prepareVetDomainProfileAvatar(this.avatarFile)
                nextProfile.avatar = await uploadVetDomainProfileAvatar(avatar.blob, avatar.filename, this.wallet.gid)
            }
            return nextProfile
        },
        uploadErrorMessage(err: unknown): string {
            const base = this.$t('address.msg_vns_profile_upload_error').toString()
            return err instanceof Error && err.message ? `${base} ${err.message}` : base
        },
        async onSubmit() {
            if (!this.canSave) {
                return
            }
            this.saving = true
            this.error = ''

            let resolver = ''
            try {
                resolver = await this.$svc.bc(this.wallet.gid).vetDomainResolverOf(this.name)
                if (!resolver) {
                    throw new Error('missing resolver')
                }
            } catch (err) {
                console.warn('resolve VNS profile:', err)
                this.error = this.$t('address.msg_vns_profile_sign_error', { name: this.name }).toString()
                this.saving = false
                return
            }

            let nextProfile: VetDomainProfile
            try {
                nextProfile = await this.buildNextProfile()
            } catch (err) {
                console.warn('upload VNS avatar:', err)
                this.error = this.uploadErrorMessage(err)
                this.saving = false
                return
            }

            try {
                const changes = changedVetDomainProfileRecords(this.initialProfile, nextProfile)
                if (changes.length === 0) {
                    this.ok()
                    return
                }
                const clauses = buildVetDomainProfileUpdateClauses(resolver, this.name, changes)
                await this.$signTx(this.wallet.gid, {
                    message: clauses,
                    options: {
                        comment: vetDomainProfileTransactionComment(this.name)
                    },
                    signers: await this.signers(),
                    preferredSigner: this.address
                })
                this.$svc.bc(this.wallet.gid).setVetDomainProfile(this.name, nextProfile)
                this.$q.notify(this.$t('address.msg_vns_profile_updated').toString())
                this.ok()
            } catch (err) {
                console.warn('update VNS profile:', err)
                this.error = this.$t('address.msg_vns_profile_sign_error', { name: this.name }).toString()
            } finally {
                this.saving = false
            }
        }
    }
})
</script>
<style scoped>
.hidden-input {
    display: none;
}
</style>
