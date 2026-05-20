<template>
    <img
        class="qr-code"
        :src="svgDataUri"
        alt=""
        draggable="false"
    >
</template>
<script lang="ts">
import { defineComponent } from 'vue'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const QRCode = require('qrcode-svg')

export default defineComponent({
    data() {
        return { content: '' }
    },
    methods: {
        extractSlot() {
            this.content = this.$slots.default![0] ? (this.$slots.default![0].text! || '') : ''
        }
    },
    computed: {
        svg(): string {
            return new QRCode({
                content: this.content,
                container: 'svg-viewbox',
                join: true
            }).svg()
        },
        svgDataUri(): string {
            return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(this.svg)}`
        }
    },
    created() {
        this.extractSlot()
    },
    beforeUpdate() {
        this.extractSlot()
    }
})
</script>
<style scoped>
.qr-code {
    display: block;
}
</style>
