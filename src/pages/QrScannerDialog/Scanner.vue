<template>
    <div class="relative-position bg-black">
        <video
            v-if="!isCordova"
            ref="vid"
            class="fit"
        />
        <div
            class="absolute-center"
            :style="scanRegionStyles"
        />
        <q-resize-observer
            @resize="size.w = $event.width;size.h = $event.height"
            :debounce="0"
        />
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { QrScanner } from 'src/utils/qr-scanner'

export default defineComponent({
    emits: ['scan', 'error'],
    data: () => {
        return {
            appElem: null as HTMLElement | null,
            destroyed: false,
            scanner: null as QrScanner | null,
            size: { w: 0, h: 0 }
        }
    },
    computed: {
        scanRegionStyles() {
            const { w, h } = this.size
            const x = Math.min(w, h) * 2 / 3
            return {
                border: '1px solid green',
                width: `${x}px`,
                height: `${x}px`
            }
        },
        isCordova(): boolean {
            return process.env.MODE === 'cordova'
        }
    },
    mounted() {
        if (this.isCordova) {
            const appElem = document.getElementById('q-app')!
            this.appElem = appElem
            window.QRScanner.prepare((err, status) => {
                if (err) {
                    return this.$emit('error', err)
                }
                if (!status.authorized) {
                    return this.$emit('error', new Error('permission denied'))
                }
                if (!this.destroyed) {
                    appElem.style.opacity = '0';
                    (this.$el as HTMLElement).classList.remove('bg-black')
                    window.QRScanner.show()
                    window.QRScanner.scan((err, result) => {
                        if (err) {
                            return this.$emit('error', err)
                        }
                        this.$emit('scan', result)
                    })
                }
            })
        } else {
            const video = this.$refs.vid as HTMLVideoElement
            const scanner = new QrScanner(
                video,
                result => {
                    this.$emit('scan', result.data)
                },
                {
                    onDecodeError: () => { },
                    preferredCamera: 'environment',
                    returnDetailedScanResult: true
                }
            )

            scanner.start().catch(err => {
                this.$emit('error', err)
            })

            this.scanner = scanner
        }
    },
    beforeUnmount() {
        this.destroyed = true
        if (this.appElem) {
            this.appElem.style.opacity = ''
            window.QRScanner.hide()
            window.QRScanner.destroy()
        }
        if (this.scanner) {
            this.scanner.destroy()
        }
    }
})
</script>
