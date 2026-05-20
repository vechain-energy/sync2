/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineBoot } from '@quasar/app-webpack/wrappers'
import { Directive } from 'vue'
import { debounce } from 'quasar'

type ScrollDividerState = {
    onScroll: () => void
    onResize: () => void
}

type ScrollDividerElement = HTMLElement & {
    _scrollDivider?: ScrollDividerState
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
            const _el = (el as any)
            _el.tabIndex = -1
            const callback = (event: any) => {
                if (!_el._needFocusout) {
                    return
                }
                if (!el.contains(event.relatedTarget)) {
                    el.focus()
                }
            }
            _el.addEventListener('focusout', callback)
            _el._needFocusout = true
            _el._focusout = {
                callback
            }
        },
        updated(el: HTMLElement, binding: any) {
            const _el = (el as any)
            _el._needFocusout = binding.value
        },
        unmounted(el: HTMLElement) {
            const _el = (el as any)
            if (_el._focusout) {
                _el.removeEventListener('focusout', _el._focusout!.callback)
                delete _el._focusout
                delete _el._needFocusout
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
