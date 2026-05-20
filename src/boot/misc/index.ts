import { defineBoot } from '@quasar/app-webpack/wrappers'
import { ComponentPublicInstance } from 'vue'
import { configureCompat } from '@vue/compat'
import * as State from './state'
import * as Plugins from './plugins'
import * as Modals from './modals'
import { genesises } from 'src/consts'

configureCompat({
    COMPONENT_V_MODEL: false
})

type CompatComponent = {
    compatConfig?: Record<string, unknown>
}

type CompatAppConfig = {
    compatConfig?: Record<string, unknown>
}

function disableLegacyVModel(component: CompatComponent | undefined) {
    if (!component) {
        return
    }

    component.compatConfig = {
        ...component.compatConfig,
        COMPONENT_V_MODEL: false
    }
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
    const appConfig = app.config as CompatAppConfig
    appConfig.compatConfig = {
        ...appConfig.compatConfig,
        COMPONENT_V_MODEL: false
    }

    for (const name of [
        'QCarousel',
        'QCheckbox',
        'QDialog',
        'QInput',
        'QOptionGroup',
        'QPopupProxy',
        'QTabPanels',
        'QToggle'
    ]) {
        disableLegacyVModel(app.component(name) as CompatComponent | undefined)
    }

    State.boot(app)
    Plugins.boot(app)
    Modals.boot(app)

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
                    vm.$once('hook:beforeUnmount', () => {
                        window.removeEventListener(event, listener)
                    })
                    window.addEventListener(event, listener)
                }
            }
        }
    })
})
