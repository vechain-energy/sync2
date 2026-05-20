<template>
    <q-item
        v-on="$listeners"
        v-bind="$attrs"
    >
        <q-item-section avatar>
            <address-avatar size="md" :addr="address" :gid="gid" />
        </q-item-section>
        <q-item-section>
            <address-label :addr="address" :gid="gid" />
        </q-item-section>
    </q-item>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import AddressAvatar from 'src/components/AddressAvatar.vue'
import AddressLabel from 'src/components/AddressLabel.vue'
export default defineComponent({
    components: {
        AddressAvatar,
        AddressLabel
    },
    props: {
        address: String,
        gid: String
    }
})
</script>
<style scoped>
.reline {
    word-break: break-all;
}
</style>
