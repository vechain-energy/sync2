<template>
    <entry
        v-for="item in uncompleted"
        :key="item.id"
        :activity="item"
    />
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import Entry from './Entry'

export default defineComponent({
    components: { Entry },
    asyncComputed: {
        uncompleted(): Promise<M.Activity[]> {
            return this.$svc.activity.uncompleted()
                .then(r => r.filter(i => i.type === 'tx'))
        }
    }
})
</script>
