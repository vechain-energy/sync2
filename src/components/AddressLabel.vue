<template>
    <div class="inline-block monospace address">
        <template v-if="test(addr)">
            {{displayString}}
        </template>
        <slot v-else>!!Invalid address!!</slot>
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { address } from 'thor-devkit'

type AsyncComputedState = Vue & {
    resolvedName: string
}

export default defineComponent({
    props: {
        addr: String,
        gid: String,
        full: Boolean
    },
    asyncComputed: {
        resolvedName: {
            async get(): Promise<string> {
                if (!this.gid || !address.test(this.addr)) {
                    return ''
                }
                this.$svc.bc(this.gid).vetDomainsRevision()
                const [name] = await this.$svc.bc(this.gid).vetDomainsNamesOf([this.addr])
                return name
            },
            default: ''
        }
    },
    computed: {
        displayString() {
            if (!address.test(this.addr)) {
                return ''
            }
            const checksumed = address.toChecksumed(this.addr)
            const { resolvedName } = this as unknown as AsyncComputedState
            if (resolvedName) {
                return this.full ? `${resolvedName} (${checksumed})` : resolvedName
            }
            return this.full ? checksumed : checksumed.slice(0, 6) + '⋯' + checksumed.slice(-6)
        }
    },
    methods: {
        test(value: string): boolean {
            return address.test(value)
        }
    }
})
</script>
<style scoped>
.address {
    letter-spacing: 0.08em;
    transform: scale(1, 0.8);
    /* transform-origin: bottom; */
    max-width: 100%;
    text-overflow: inherit;
    white-space: inherit;
    overflow: inherit;
    vertical-align: middle;
}
</style>
