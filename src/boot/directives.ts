/* eslint-disable @typescript-eslint/no-explicit-any */
import { boot } from 'quasar/wrappers'
import { VueConstructor } from 'vue'

type BootParams = {
    Vue: VueConstructor
}
import { debounce } from 'quasar'

type ScrollDividerState = {
    onScroll: () => void
    onResize: () => void
}

type ScrollDividerElement = HTMLElement & {
    _scrollDivider?: ScrollDividerState
}

export const scrollDivider: Vue.DirectiveOptions = {
    inserted: (el, bind) => {
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
    unbind: el => {
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

const directives: Record<string, Vue.DirectiveOptions> = {
    scrollDivider,
    nofocusout: {
        bind(el: HTMLElement) {
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
        update(el: HTMLElement, binding: any) {
            const _el = (el as any)
            _el._needFocusout = binding.value
        },
        unbind(el: HTMLElement) {
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
        inserted: el => {
            const r = el.getElementsByClassName('q-focus-helper')
            r && r.length > 0 && r[0].remove()
        }
    }
}

export default boot(({ Vue }: BootParams) => {
    Object.entries(directives).forEach(([name, definition]) => {
        Vue.directive(name, definition)
    })
})
