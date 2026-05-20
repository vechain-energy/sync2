<template>
    <component
        :is="tag"
        v-intersection="options"
    >
        <slot :entry="entry" />
    </component>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    props: {
        tag: { default: 'div' },
        cfg: Object
    },
    data: () => {
        return {
            entry: {}
        }
    },
    computed: {
        options() {
            return {
                handler: (entry: {}) => { this.entry = entry },
                cfg: this.cfg
            }
        }
    }
})
</script>
