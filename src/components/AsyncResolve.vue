<template>
    <component
        v-if="tag"
        :is="tag"
    >
        <slot
            :data="data"
            :state="$asyncComputed.data"
        />
    </component>
    <slot
        v-else
        :data="data"
        :state="$asyncComputed.data"
    />
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    props: {
        tag: String,
        promise: Promise as unknown as () => (Promise<unknown> | null)
    },
    asyncComputed: {
        data(): Promise<unknown> {
            if (!this.promise) {
                return Promise.resolve(this.data)
            }
            return this.promise
        }
    }
})
</script>
