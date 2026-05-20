<template>
    <svg
        v-if="isBetterSwap"
        :width="sizeValue"
        :height="sizeValue"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <rect
            width="32"
            height="32"
            rx="4"
            fill="#000000"
        />
        <path
            d="M27.1113 18.2502C26.8649 17.9295 26.5926 17.6427 26.2949 17.3892L21.5105 21.0938C21.4697 22.4315 20.631 23.1005 18.9942 23.1005H18.9189L11.9738 28.4782H20.3213C22.8626 28.4782 24.8367 27.8996 26.2434 26.7424C27.6501 25.5852 28.3538 23.9857 28.3538 21.9433C28.3538 20.5592 27.9394 19.3282 27.1113 18.2502Z"
            fill="#FFFFFF"
        />
        <path
            d="M27.6991 10.836C27.6991 8.86222 27.0011 6.27989 25.6059 5.19083C24.2103 4.10176 22.2874 3.55681 19.8368 3.55682H8.33262V17.6668L11.3195 15.3505L15.0037 12.4748V8.86674H18.3731C18.8086 8.86674 19.7341 8.83209 19.9589 9.05695C20.7337 9.83166 20.4264 11.0472 19.9023 11.5303C19.8049 11.6201 19.6982 11.7195 19.5814 11.8295C19.4991 11.9069 19.4125 11.9798 19.3222 12.0477L15.0037 15.2932L10.2059 18.965L7.15909 21.4083L6.23537 19.8432L1.40462 28.4729H11.3287L10.4157 26.926L26.0913 14.7484C26.5695 14.3769 26.9562 13.8981 27.2046 13.3458C27.5342 12.6133 27.6991 11.7766 27.6991 10.836Z"
            fill="#FFFFFF"
        />
    </svg>
    <svg
        v-else
        :width="sizeValue"
        :height="sizeValue"
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <defs>
            <linearGradient
                :id="gradientOne"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
            >
                <stop
                    offset="0%"
                    stop-color="#ec4899"
                />
                <stop
                    offset="100%"
                    stop-color="#9333ea"
                />
            </linearGradient>
            <linearGradient
                :id="gradientTwo"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
            >
                <stop
                    offset="0%"
                    stop-color="#9333ea"
                />
                <stop
                    offset="100%"
                    stop-color="#ec4899"
                />
            </linearGradient>
        </defs>
        <g transform="rotate(-30 256 256)">
            <path
                d="M440.712 282.966c-32.398-54.779-92.034-91.509-160.268-91.509v32.705c0 11.693-13.789 17.925-22.566 10.197L156.16 144.796c-6.145-5.411-6.144-14.988.003-20.397l101.718-89.512c8.777-7.724 22.563-1.492 22.563 10.2v32.716c110.627 0 193.535 94.769 185.668 199.701C465.114 290.808 447.503 294.449 440.712 282.966z"
                :fill="`url(#${gradientOne})`"
            />
            <path
                d="M71.285 229.034c32.398 54.779 92.034 91.509 160.268 91.509v-32.705c0-11.693 13.789-17.925 22.566-10.197l101.718 89.563c6.145 5.411 6.144 14.988-.003 20.397l-101.718 89.512c-8.777 7.724-22.563 1.492-22.563-10.2l0-32.716c-110.627 0-193.535-94.768-185.668-199.701C46.882 221.192 64.493 217.551 71.285 229.034z"
                :fill="`url(#${gradientTwo})`"
            />
        </g>
    </svg>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    props: {
        name: String,
        size: {
            type: [Number, String],
            default: 28
        }
    },
    data() {
        return {
            idSuffix: Math.random().toString(36).slice(2)
        }
    },
    computed: {
        sizeValue(): string {
            return typeof this.size === 'number' ? `${this.size}px` : this.size
        },
        isBetterSwap(): boolean {
            return (this.name || '').toLowerCase().includes('better')
        },
        gradientOne(): string {
            return `vetrade-gradient-1-${this.idSuffix}`
        },
        gradientTwo(): string {
            return `vetrade-gradient-2-${this.idSuffix}`
        }
    }
})
</script>
