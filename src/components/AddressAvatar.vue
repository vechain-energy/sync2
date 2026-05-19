<template>
    <q-avatar v-bind="$attrs">
        <img
            :src="src"
            alt=""
            @error="onImageError"
        />
    </q-avatar>
</template>
<script lang="ts">
import Vue from 'vue'
import { picasso } from '@vechain/picasso'

type AsyncComputedState = Vue & {
    vetDomainAvatar: string
}

export default Vue.extend({
    props: {
        addr: String,
        gid: String
    },
    data() {
        return {
            failedSrc: ''
        }
    },
    asyncComputed: {
        vetDomainAvatar: {
            async get(): Promise<string> {
                if (!this.addr || !this.gid) {
                    return ''
                }
                this.$svc.bc(this.gid).vetDomainsRevision()
                return this.$svc.bc(this.gid).vetDomainAvatarOfAddress(this.addr)
            },
            default: ''
        }
    },
    computed: {
        picassoSrc(): string {
            return this.addr ? `data:image/svg+xml;utf8,${picasso(this.addr.toLowerCase())}` : ''
        },
        src(): string {
            const { vetDomainAvatar } = this as unknown as AsyncComputedState
            return vetDomainAvatar && vetDomainAvatar !== this.failedSrc ? vetDomainAvatar : this.picassoSrc
        }
    },
    watch: {
        vetDomainAvatar() {
            this.failedSrc = ''
        }
    },
    methods: {
        onImageError() {
            const { vetDomainAvatar } = this as unknown as AsyncComputedState
            this.failedSrc = vetDomainAvatar
        }
    }
})
</script>
