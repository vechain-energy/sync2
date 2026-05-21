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
import { uncompletedTxActivities } from 'pages/Activities/pending'

export default defineComponent({
    components: { Entry },
    asyncComputed: {
        uncompleted(): Promise<M.Activity[]> {
            return this.$svc.activity.uncompleted()
                .then(uncompletedTxActivities)
        }
    }
})
</script>
