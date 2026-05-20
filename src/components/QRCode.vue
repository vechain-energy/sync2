<template>
    <img
        class="qr-code"
        :src="svgDataUri"
        alt=""
        draggable="false"
    >
</template>
<script lang="ts">
import { defineComponent, VNode } from 'vue'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const QRCode = require('qrcode-svg')

function vnodeText(node: VNode): string {
    if (typeof node.children === 'string') {
        return node.children
    }
    if (Array.isArray(node.children)) {
        return node.children.map(child => typeof child === 'string' ? child : vnodeText(child)).join('')
    }
    return ''
}

export default defineComponent({
    data() {
        return { content: '' }
    },
    methods: {
        extractSlot() {
            const nodes = this.$slots.default ? this.$slots.default() : []
            this.content = nodes.map(vnodeText).join('')
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
