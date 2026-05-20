import { defineBoot } from '@quasar/app-webpack/wrappers'
import { Directive, DirectiveBinding } from 'vue'
import { debounce } from 'quasar'

type ScrollDividerState = {
    onScroll: () => void
    onResize: () => void
}

type ScrollDividerElement = HTMLElement & {
    _scrollDivider?: ScrollDividerState
}
type FocusoutState = {
    callback: (event: FocusEvent) => void
}
type FocusoutElement = HTMLElement & {
    _needFocusout?: boolean
    _focusout?: FocusoutState
}

export const scrollDivider: Directive<ScrollDividerElement> = {
    mounted: (el, bind) => {
        const target = el as ScrollDividerElement
        const { top = true, bottom, both } = bind.modifiers
        const onScroll = () => {
            if (top || both) {
                const opacity = 0.12 * (el.scrollTop > 50 ? 1 : el.scrollTop / 50)
                el.style.borderTop = `1px solid rgba(0,0,0,${opacity})`
            }
            if (bottom || both) {
                const st = el.scrollHeight - el.scrollTop - el.clientHeight
                const opacity = 0.12 * (st > 50 ? 1 : st / 50)
                el.style.borderBottom = `1px solid rgba(0,0,0,${opacity})`
            }
        }
        const onResize = debounce(onScroll, 300)

        target._scrollDivider = {
            onScroll,
            onResize
        }

        el.addEventListener('scroll', onScroll)
        window.addEventListener('resize', onResize)

        // get correct initial state
        onScroll()
    },
    unmounted: el => {
        const target = el as ScrollDividerElement
        const state = target._scrollDivider
        if (!state) {
            return
        }

        el.removeEventListener('scroll', state.onScroll)
        window.removeEventListener('resize', state.onResize)
        delete target._scrollDivider
    }
}

const directives: Record<string, Directive> = {
    scrollDivider,
    nofocusout: {
        mounted(el: HTMLElement) {
            const target = el as FocusoutElement
            target.tabIndex = -1
            const callback = (event: FocusEvent) => {
                if (!target._needFocusout) {
                    return
                }
                const relatedTarget = event.relatedTarget
                if (!(relatedTarget instanceof Node) || !el.contains(relatedTarget)) {
                    el.focus()
                }
            }
            target.addEventListener('focusout', callback)
            target._needFocusout = true
            target._focusout = {
                callback
            }
        },
        updated(el: HTMLElement, binding: DirectiveBinding<boolean | undefined>) {
            const target = el as FocusoutElement
            target._needFocusout = binding.value
        },
        unmounted(el: HTMLElement) {
            const target = el as FocusoutElement
            if (target._focusout) {
                target.removeEventListener('focusout', target._focusout.callback)
                delete target._focusout
                delete target._needFocusout
            }
        }
    },
    // this directive helps to remove focus helper in q-btn component.
    // the focus helper may cause focus problem in form input.
    disableFocusHelper: {
        mounted: el => {
            const r = el.getElementsByClassName('q-focus-helper')
            r && r.length > 0 && r[0].remove()
        }
    }
}

export default defineBoot(({ app }) => {
    Object.entries(directives).forEach(([name, definition]) => {
        app.directive(name, definition)
    })
})
