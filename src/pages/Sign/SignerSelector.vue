<template>
    <div>
        <signer-item
            :text="signer"
            :caption="groupCaption"
            :sideIcon="count > 1 ? 'unfold_more': ''"
            :clickable="count > 1"
            :gid="gid"
            :resolveName="false"
        />
        <q-popup-proxy
            v-if="count > 1"
            position="bottom"
            fit
            :breakpoint="0"
            @show="onPopupShow()"
        >
            <q-card>
                <q-list padding>
                    <template
                        v-for="(g, gi) in groups"
                        :key="gi"
                    >
                        <q-item-label
                            header
                            class="ellipsis"
                        >{{groupDisplayName(g, gi)}}</q-item-label>
                        <signer-item
                            :ref="addr"
                            v-close-popup
                            clickable
                            v-for="(addr, ai) in g.addresses"
                            :key="`a-${gi}-${ai}`"
                            :text="addr"
                            :active="signer === addr"
                            :gid="gid"
                            @click="$emit('select', addr)"
                        />
                    </template>
                </q-list>
            </q-card>
        </q-popup-proxy>
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import SignerItem from './SignerItem.vue'
import { count } from 'src/utils/array'
import { SignerGroup } from './models'
import { firstVetDomainWalletName } from 'src/utils/vet-domain-wallet-name'

type AsyncComputedState = Vue & {
    groupVetNames: string[]
}

export default defineComponent({
    emits: ['select'],
    components: { SignerItem },
    props: {
        signer: String,
        gid: String,
        groups: {
            type: Array as () => SignerGroup[],
            default: () => []
        }
    },
    computed: {
        group(): SignerGroup | null {
            return this.groups.find(g => g.addresses.includes(this.signer)) || null
        },
        groupCaption(): string {
            const group = this.group
            return group ? this.groupDisplayName(group, this.groups.indexOf(group)) : ''
        },
        count(): number {
            return count(this.groups, g => g.addresses.length)
        }
    },
    asyncComputed: {
        groupVetNames: {
            async get(): Promise<string[]> {
                if (!this.gid) {
                    return this.groups.map(() => '')
                }
                try {
                    this.$svc.bc(this.gid).vetDomainsRevision()
                    return Promise.all(this.groups.map(async group => {
                        const names = await this.$svc.bc(this.gid).vetDomainsNamesOf(group.addresses)
                        return firstVetDomainWalletName(names)
                    }))
                } catch (err) {
                    console.warn('signer .vet names:', err)
                    return this.groups.map(() => '')
                }
            },
            default: () => [] as string[]
        }
    },
    methods: {
        groupDisplayName(group: SignerGroup, index: number): string {
            const { groupVetNames } = this as unknown as AsyncComputedState
            return groupVetNames[index] || group.name
        },
        onPopupShow() {
            const item = this.$refs[this.signer] as Vue[]
            if (item) {
                item[0].$el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }
        }
    }
})
</script>
