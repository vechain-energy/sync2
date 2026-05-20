<template>
    <span>
        <svg-ledger v-if="wallet.meta.type === 'ledger'" />
        <q-icon
            v-if="wallet.meta.type === 'private-key'"
            name="vpn_key"
        />
        {{displayName}}
    </span>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import SvgLedger from 'src/components/SvgLedger.vue'
import { vetDomainWalletDisplayName } from 'src/utils/vet-domain-wallet-name'

export default defineComponent({
    components: { SvgLedger },
    props: {
        wallet: Object as () => M.Wallet
    },
    asyncComputed: {
        primaryNames: {
            async get(): Promise<string[]> {
                this.$svc.bc(this.wallet.gid).vetDomainsRevision()
                return this.$svc.bc(this.wallet.gid).vetDomainsNamesOf(this.wallet.meta.addresses)
            },
            default: [] as string[]
        }
    },
    computed: {
        displayName(): string {
            return vetDomainWalletDisplayName(this.wallet, this.primaryNames)
        }
    }
})
</script>
