import { defineBoot } from '@quasar/app-webpack/wrappers'
import { ComponentPublicInstance } from 'vue'
import * as State from './state'
import * as Plugins from './plugins'
import * as Modals from './modals'
import { genesises } from 'src/consts'

const beforeUnmountCleanups = new WeakMap<ComponentPublicInstance, Array<() => void>>()

function addBeforeUnmountCleanup(vm: ComponentPublicInstance, cleanup: () => void) {
    const cleanups = beforeUnmountCleanups.get(vm) || []
    cleanups.push(cleanup)
    beforeUnmountCleanups.set(vm, cleanups)
}

declare module 'vue' {
    interface ComponentCustomProperties {
        /** navigate back or go to home(/) if stack empty */
        $backOrHome(): void
        /** returns the display name of network identified by gid */
        $netDisplayName(gid: string): string
        /** it wraps window.addEventListener binding to vue component's life-cycle */
        $onWindowEvent(event: keyof WindowEventMap, listener: EventListenerOrEventListenerObject): void
    }
}

export default defineBoot(({ app }) => {
    State.boot(app)
    Plugins.boot(app)
    Modals.boot(app)

    app.mixin({
        beforeUnmount() {
            const vm = this as ComponentPublicInstance
            const cleanups = beforeUnmountCleanups.get(vm) || []
            beforeUnmountCleanups.delete(vm)
            for (const cleanup of cleanups) {
                cleanup()
            }
        }
    })

    Object.defineProperties(app.config.globalProperties, {
        $backOrHome: {
            get() {
                const vm = this as ComponentPublicInstance
                return () => {
                    vm.$stack.canGoBack
                        ? vm.$router.back()
                        : vm.$router.replace('/')
                }
            }
        },
        $netDisplayName: {
            get(): ComponentPublicInstance['$netDisplayName'] {
                const vm = this as ComponentPublicInstance
                return gid => {
                    switch (gid) {
                        case genesises.main.id: return vm.$t('common.mainnet').toString()
                        case genesises.test.id: return vm.$t('common.testnet').toString()
                        default: {
                            const name = vm.$t('common.private').toString()
                            const suffix = gid ? `-${gid.slice(-6)}` : ''
                            return name + suffix
                        }
                    }
                }
            }
        },
        $onWindowEvent: {
            get(): ComponentPublicInstance['$onWindowEvent'] {
                const vm = this as ComponentPublicInstance
                return (event, listener) => {
                    addBeforeUnmountCleanup(vm, () => {
                        window.removeEventListener(event, listener)
                    })
                    window.addEventListener(event, listener)
                }
            }
        }
    })
})
