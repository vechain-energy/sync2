<template>
    <q-avatar
        v-bind="$attrs"
        color="white"
        class="bordered"
    >
        <q-img
            :src="spec.iconSrc"
            class="fit token-avatar-image"
            spinner-size="100%"
        />
    </q-avatar>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
    props: {
        spec: Object as () => M.TokenSpec
    }
})
</script>
<style scoped>
.bordered {
    box-sizing: content-box;
    border: 1px solid rgba(0, 0, 0, 0.2);
}

.token-avatar-image {
    border-radius: inherit;
}
</style>
