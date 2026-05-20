<template>
    <q-list>
        <q-item-label
            header
            class="text-h6 text-dark"
        >{{$t('backup.label_your_private_key')}}</q-item-label>
        <q-item>
            <q-item-section>
                <q-banner class="bg-red-1 text-negative">
                    {{$t('address.msg_private_key_reveal_warning')}}
                </q-banner>
            </q-item-section>
        </q-item>
        <q-item v-if="address">
            <q-item-section>
                <q-item-label caption>{{$t('common.address')}}</q-item-label>
                <q-item-label class="monospace break-all">{{address}}</q-item-label>
            </q-item-section>
        </q-item>
        <q-item>
            <q-item-section>
                <q-input
                    readonly
                    outlined
                    type="textarea"
                    input-class="monospace"
                    class="private-key-backup__input"
                    :label="$t('address.label_private_key')"
                    :model-value="privateKey"
                />
            </q-item-section>
        </q-item>
    </q-list>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    props: {
        privateKey: {
            type: String,
            default: ''
        },
        address: {
            type: String,
            default: ''
        }
    }
})
</script>
<style scoped>
.private-key-backup__input {
    width: 100%;
}
</style>
