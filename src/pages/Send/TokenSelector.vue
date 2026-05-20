<template>
    <div>
        <async-resolve
            v-if="token"
            :promise="$svc.bc(token.gid).balanceOf(address, token)"
            v-slot="{data}"
        >
            <TokenItem
                clickable
                :token="token"
                :balance="data"
                :selectIcon="true"
            />
        </async-resolve>
        <q-popup-proxy
            position="bottom"
            fit
            :breakpoint="0"
        >
            <q-card>
                <q-list
                    padding
                >
                    <async-resolve
                        v-for="item in tokens"
                        :key="item.symbol"
                        :promise="$svc.bc(item.gid).balanceOf(address, item)"
                        v-slot="{data}"
                    >
                        <TokenItem
                            clickable
                            v-close-popup
                            @click="onSelect(item.symbol)"
                            :balance="data"
                            :token="item"
                        />
                    </async-resolve>
                </q-list>
            </q-card>
        </q-popup-proxy>
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import TokenItem from './TokenItem.vue'
import AsyncResolve from 'components/AsyncResolve'

export default defineComponent({
    emits: ['update:modelValue', 'change'],
    components: {
        TokenItem,
        AsyncResolve
    },
    props: {
        address: String,
        tokens: {
            type: Array as () => M.TokenSpec[],
            default: () => []
        },
        modelValue: String
    },
    computed: {
        token() {
            return this.tokens.find(t => t.symbol === this.modelValue)
        }
    },
    methods: {
        onSelect(symbol: string) {
            this.$emit('update:modelValue', symbol)
            this.$emit('change', symbol)
        }
    }
})
</script>
