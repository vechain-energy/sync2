<template>
    <q-toolbar class="q-px-xs">
        <button
            class="page-toolbar-nav-btn"
            type="button"
            :aria-label="navButtonLabel"
            :title="navButtonLabel"
            @pointerdown.stop
            @pointerup.stop="onPointerUpNavButton"
            @mousedown.stop
            @touchstart.stop="onTouchStartNavButton"
            @touchend.stop="onTouchEndNavButton"
            @click.stop="onClickNavButton"
        >
            <q-icon :name="icon || 'chevron_left'" />
        </button>
        <q-toolbar-title class="text-center">
            <div
                ref="title"
                class="ellipsis"
                :style="titleStyle"
            >{{title}}
            </div>
            <q-resize-observer
                @resize="centerTitleText"
                debounce="0"
            />
            <q-badge
                v-if="warn"
                color="negative"
                class="absolute-top-right no-pointer-events text-bold"
            >
                {{warn}}
            </q-badge>
        </q-toolbar-title>
        <!-- action buttons -->
        <slot />
    </q-toolbar>
</template>
<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { genesises } from 'src/consts'

type AttrsWithListeners = Record<string, unknown>
type ComponentWithVNodeProps = {
    $: {
        vnode: {
            props?: AttrsWithListeners | null
        }
    }
}
type ActionHandler = (...args: unknown[]) => unknown
type TouchPoint = {
    x: number;
    y: number;
}
const CLICK_SUPPRESSION_MS = 500
const TOUCH_TAP_MAX_MOVE_PX = 12

function isPrimaryPointerRelease(event: PointerEvent): boolean {
    if (event.isPrimary === false) {
        return false
    }
    if (event.pointerType === 'mouse') {
        return event.button === 0
    }
    return true
}

export default defineComponent({
    emits: ['action'],
    props: {
        title: String,
        icon: String,
        navLabel: String,
        action: Function as PropType<() => void>,
        gid: String // to check if in dev mode
    },
    data: () => {
        return {
            titleMargin: {
                left: 0,
                right: 0
            },
            lastNavActionAt: 0,
            touchStartPoint: null as TouchPoint | null
        }
    },
    computed: {
        warn(): string {
            if (!this.gid || this.gid === genesises.main.id) {
                return ''
            }
            return this.$netDisplayName(this.gid)
        },
        titleStyle(): { marginLeft: string, marginRight: string } {
            return {
                marginLeft: `${this.titleMargin.left}px`,
                marginRight: `${this.titleMargin.right}px`
            }
        },
        navButtonLabel(): string {
            if (this.navLabel) {
                return this.navLabel
            }
            if (this.icon === 'close') {
                return this.$t('common.close').toString()
            }
            if (this.icon === 'menu') {
                return this.$t('common.more').toString()
            }
            return this.$t('common.back').toString()
        }
    },
    methods: {
        onPointerUpNavButton(event: PointerEvent) {
            if (!isPrimaryPointerRelease(event)) {
                return
            }
            if (this.runNavButtonActionOnce()) {
                event.preventDefault()
            }
        },
        onClickNavButton(event: MouseEvent) {
            event.preventDefault()
            this.runNavButtonActionOnce()
        },
        onTouchStartNavButton(event: TouchEvent) {
            const touch = event.changedTouches[0] || event.touches[0]
            this.touchStartPoint = touch
                ? { x: touch.clientX, y: touch.clientY }
                : null
        },
        onTouchEndNavButton(event: TouchEvent) {
            if (!this.isTouchTap(event)) {
                this.touchStartPoint = null
                return
            }
            if (this.runNavButtonActionOnce()) {
                event.preventDefault()
            }
            this.touchStartPoint = null
        },
        isTouchTap(event: TouchEvent) {
            const touch = event.changedTouches[0]
            if (!touch || !this.touchStartPoint) {
                return false
            }
            const dx = touch.clientX - this.touchStartPoint.x
            const dy = touch.clientY - this.touchStartPoint.y
            return Math.hypot(dx, dy) <= TOUCH_TAP_MAX_MOVE_PX
        },
        runNavButtonActionOnce() {
            if (Date.now() - this.lastNavActionAt < CLICK_SUPPRESSION_MS) {
                return false
            }
            this.lastNavActionAt = Date.now()
            this.runNavButtonAction()
            return true
        },
        runNavButtonAction() {
            if (this.icon === 'menu' || this.icon === 'close' || this.hasActionListener()) {
                this.invokeAction()
            } else {
                this.$backOrHome()
            }
        },
        actionListener(): ActionHandler | ActionHandler[] | null {
            const attrs = this.$attrs as AttrsWithListeners
            const vnodeProps = (this as ComponentWithVNodeProps).$.vnode.props || {}
            const listener = attrs.onAction || vnodeProps.onAction
            return typeof listener === 'function' || Array.isArray(listener)
                ? listener as ActionHandler | ActionHandler[]
                : null
        },
        invokeAction() {
            if (this.action) {
                this.action()
                return
            }
            const listener = this.actionListener()
            if (Array.isArray(listener)) {
                listener.forEach(fn => fn())
                return
            }
            if (listener) {
                listener()
                return
            }
            this.$emit('action')
        },
        hasActionListener() {
            return this.actionListener() !== null
        },
        centerTitleText() {
            const titleRect = (this.$refs.title as HTMLElement).getBoundingClientRect()
            const containerRect = (this.$el as HTMLElement).getBoundingClientRect()

            const leftSpace = titleRect.left - containerRect.left - this.titleMargin.left
            const rightSpace = containerRect.right - titleRect.right - this.titleMargin.right

            this.titleMargin.left = Math.max(leftSpace, rightSpace) - leftSpace
            this.titleMargin.right = Math.max(leftSpace, rightSpace) - rightSpace
        }
    }
})
</script>
<style scoped>
.page-toolbar-nav-btn {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: 50%;
    color: currentColor;
    cursor: pointer;
    display: inline-flex;
    flex: 0 0 42px;
    font: inherit;
    height: 42px;
    justify-content: center;
    margin: 0;
    outline: 0;
    padding: 0;
    width: 42px;
}

.page-toolbar-nav-btn:active,
.page-toolbar-nav-btn:focus-visible {
    background: rgba(0, 0, 0, 0.08);
}
</style>
