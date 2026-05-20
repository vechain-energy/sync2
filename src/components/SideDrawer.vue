<template>
    <div class="drawer-container fixed q-drawer--top-padding">
        <!-- the backdrop -->
        <div
            ref="backdrop"
            class="drawer-backdrop drawer-transition fixed-full"
            v-show="opened || panning"
            v-touch-pan.left.mouse.prevent="handleTouchPan"
            @click="onClickBackdrop"
        />
        <!-- the opener -->
        <!-- <div
            v-show="!opened&&!transiting&&!disable"
            class="drawer-opener fixed-left"
            v-touch-pan.right.mouse.prevent="handleTouchPan"
        /> -->
        <!-- content wrapper-->
        <aside
            class="drawer fixed-left q-drawer__content"
            :class="{invisible: invisible, 'drawer-disable-pointer-events': panning}"
            v-touch-pan.left.mouse.prevent="handleTouchPan"
        >
            <slot />
            <q-resize-observer @resize="onContentResize" />
        </aside>
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { newVelometer } from 'src/utils/transit'

type TouchPanEvent = {
    isFirst?: boolean;
    isFinal?: boolean;
    offset: { x: number };
    delta: { x: number };
    duration: number;
}

function parentElement(vm: Vue): HTMLElement | null {
    if (!vm.$parent || !(vm.$parent.$el instanceof HTMLElement)) {
        return null
    }
    return vm.$parent.$el
}

export default defineComponent({
    props: {
        modelValue: Boolean,
        disable: Boolean
    },
    data: () => {
        return {
            width: 0,
            panning: false,
            openRatio: 0,
            touchPanInitOffset: 0,
            transitionMul: 1,
            opened: false,
            velometer: newVelometer()
        }
    },
    computed: {
        invisible() {
            return !this.opened && !this.panning
        }
    },
    watch: {
        modelValue(newVal: boolean) {
            this.setOpened(newVal)
        },
        width(newVal: number) {
            this.setParentProperty('--drawer-width', `${newVal}`)
        },
        openRatio(newVal: number) {
            this.setParentProperty('--drawer-open-ratio', `${newVal}`)
        },
        transitionMul(newVal: number) {
            this.setParentProperty('--drawer-transition-mul', `${newVal}`)
        }
    },
    methods: {
        setParentProperty(name: string, value: string) {
            const parent = parentElement(this)
            if (!parent) {
                return
            }
            parent.style.setProperty(name, value)
        },
        onClickBackdrop() {
            if (this.opened && !this.panning) {
                this.setOpened(false)
                this.$emit('update:modelValue', false)
                this.$emit('open', false)
            }
        },
        onContentResize(size: { width: number }) {
            if (size.width > 0) {
                this.width = size.width
            }
        },
        setOpened(opened: boolean) {
            this.opened = opened
            this.openRatio = opened ? 1 : 0
            if (opened) {
                document.body.classList.add('drawer-body--prevent-scroll')
            } else {
                document.body.classList.remove('drawer-body--prevent-scroll')
            }
            this.transitionMul = 1
        },
        handleTouchPanExternal(ev: TouchPanEvent) {
            if (this.opened || this.disable) {
                return
            }
            this.handleTouchPan(ev)
        },
        handleTouchPan(ev: TouchPanEvent) {
            if (ev.isFirst) {
                document.body.classList.add('drawer-body--prevent-scroll')
                this.panning = true
                this.touchPanInitOffset = ev.offset.x
            }

            const width = Math.max(1, this.width)
            const offset = Math.min(Math.abs(ev.offset.x - this.touchPanInitOffset), width)
            const ratio = this.opened ? (width - offset) / width : offset / width
            this.openRatio = ratio

            if (ev.isFinal) {
                this.panning = false
                const v = this.opened ? -this.velometer.velocity : this.velometer.velocity

                const triggered = (offset > width / 3 && v >= 0) || v > 0.3
                this.transitionMul = 0.7
                if (triggered) {
                    this.setOpened(!this.opened)
                    this.$emit('update:modelValue', this.opened)
                    this.$emit('open', this.opened)
                } else {
                    this.setOpened(this.opened)
                }
            }

            this.velometer.update(ev.duration, ev.delta.x)
        }
    },
    mounted() {
        const parent = parentElement(this)
        if (parent) {
            parent.classList.add('drawer-parent', 'drawer-transition')
        }
        this.setOpened(this.modelValue)
    },
    beforeUnmount() {
        const parent = parentElement(this)
        if (parent) {
            parent.classList.remove('drawer-parent', 'drawer-transition')
        }
        document.body.classList.remove('drawer-body--prevent-scroll')
    }
})
</script>
<style >
:root {
    --drawer-width: 0;
    --drawer-open-ratio: 0;
    --drawer-transition-mul: 1;
}
.drawer-container {
    z-index: 2001;
}
.drawer-backdrop {
    background: black;
    opacity: calc(var(--drawer-open-ratio) * 0.2);
}
.drawer-opener {
    width: 20px;
}
.drawer {
    transform: translateX(-100%);
}
.drawer-parent {
    transform: translateX(
        calc(var(--drawer-width) * var(--drawer-open-ratio) * 1px)
    );
}
.drawer-transition {
    transition: all calc(0.25s * var(--drawer-transition-mul));
}
.drawer-body--prevent-scroll {
    position: fixed !important;
}
.drawer-disable-pointer-events,
.drawer-disable-pointer-events * {
    pointer-events: none !important;
}
</style>
