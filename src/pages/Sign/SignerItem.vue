<template>
    <q-item
        v-bind="$attrs"
    >
        <q-item-section avatar>
            <address-avatar
                v-if="isTextAddress"
                :addr="text"
                :gid="gid"
                size="md"
            />
        </q-item-section>
        <q-item-section no-wrap>
            <q-item-label class="ellipsis">
                <template v-if="resolveName">
                    <address-label :addr="text" :gid="gid" />
                </template>
                <template v-else>{{displayText}}</template>
            </q-item-label>
            <q-item-label
                class="ellipsis"
                v-if="caption"
                caption
            >
                {{ caption }}
            </q-item-label>
        </q-item-section>
        <q-item-section side>
            <q-icon
                v-if="sideIcon"
                size="xs"
                :name="sideIcon"
            />
        </q-item-section>
    </q-item>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import AddressAvatar from 'src/components/AddressAvatar.vue'
import { address } from 'thor-devkit'
import AddressLabel from 'src/components/AddressLabel.vue'

export default defineComponent({
    components: { AddressAvatar, AddressLabel },
    props: {
        text: String,
        gid: String,
        caption: String,
        sideIcon: String,
        resolveName: {
            type: Boolean,
            default: true
        }
    },
    computed: {
        isTextAddress() {
            return address.test(this.text)
        },
        displayText(): string {
            if (!address.test(this.text)) {
                return this.text || ''
            }
            const checksumed = address.toChecksumed(this.text)
            return checksumed.slice(0, 6) + '⋯' + checksumed.slice(-6)
        }
    }
})
</script>
