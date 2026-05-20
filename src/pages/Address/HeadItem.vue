<template>
    <q-item
        v-bind="$attrs"
    >
        <q-item-section avatar>
            <address-avatar
                :addr="address"
                :gid="gid"
                size="xl"
            />
        </q-item-section>
        <q-item-section>
            <q-item-label>
                <address-label :addr="address" :gid="gid" />
            </q-item-label>
            <q-item-label
                caption
                class="ellipsis"
            >
                {{name}}
            </q-item-label>
        </q-item-section>
        <q-item-section side>
            <q-btn
                flat
                round
                @click="showQR"
                icon="qr_code_2"
                :aria-label="$t('address.action_receive').toString()"
                :title="$t('address.action_receive').toString()"
            />
        </q-item-section>
    </q-item>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import AddressAvatar from 'src/components/AddressAvatar.vue'
import AddressLabel from 'src/components/AddressLabel.vue'
import { address } from 'thor-devkit'

export default defineComponent({
    components: {
        AddressAvatar,
        AddressLabel
    },
    props: {
        address: String,
        gid: String,
        name: String,
        primaryName: String
    },
    methods: {
        showQR() {
            const content = address.toChecksumed(this.address)
            this.$qrcode({
                title: this.$t('address.action_receive').toString(),
                content,
                caption: this.primaryName,
                message: content,
                messageClass: 'text-center'
            })
        }
    }
})
</script>
