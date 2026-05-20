import { App, Component, ComponentPublicInstance, reactive } from 'vue'
import { RouteLocationNormalizedLoaded, RouteRecordNormalized, Router } from 'vue-router'

export type ScopedEntry = RouteLocationNormalizedLoaded & {
    depth: number
    record?: RouteRecordNormalized
    component?: Component
}

type StackState = {
    entries: ScopedEntry[]
}

type StackApi = {
    readonly canGoBack: boolean
    readonly full: ScopedEntry[]
    readonly scoped: ScopedEntry[]
    readonly appTriggered: boolean
}

declare module 'vue' {
    interface ComponentCustomProperties {
        $stack: StackApi
    }
}

function getScopeRoot(vm: ComponentPublicInstance | null, entries: ScopedEntry[]) {
    while (vm) {
        for (const entry of entries) {
            for (let i = 0; i < entry.matched.length; i++) {
                const record = entry.matched[i]
                if (vm === record.instances.default) {
                    return [record, i] as const
                }
            }
        }
        vm = vm.$parent
    }
}

export function createRouterStack(router: Router) {
    const stack = reactive<StackState>({ entries: [] })
    let appTriggerN = 0

    const history = window.history
    let depth = (history.state || {}).__depth || 0
    const pushStateFn = history.pushState.bind(history)
    const replaceStateFn = history.replaceState.bind(history)
    const goFn = history.go.bind(history)

    history.pushState = (data, title, url) => {
        appTriggerN = 1
        data = data || {}
        depth++
        pushStateFn({
            __depth: depth,
            ...data
        }, title, url)
    }

    history.replaceState = (data, title, url) => {
        appTriggerN = 1
        data = data || {}
        replaceStateFn({
            __depth: depth,
            ...data
        }, title, url)
    }

    history.go = delta => {
        appTriggerN = 2
        goFn(delta)
    }

    window.addEventListener('popstate', () => {
        appTriggerN--
        const data = history.state || {}
        if (typeof data.__depth === 'number') {
            depth = data.__depth
        } else {
            depth++
            replaceStateFn({
                __depth: depth,
                ...data
            }, '')
        }
    })

    router.afterEach(to => {
        setTimeout(() => {
            const state = history.state || {}
            const depth = state.__depth
            const i = stack.entries.findIndex(entry => entry.depth >= depth)
            if (i >= 0) {
                stack.entries.splice(i)
            }
            stack.entries.push({
                ...to,
                depth
            })
        }, 0)
    })

    return {
        install(app: App) {
            Object.defineProperty(app.config.globalProperties, '$stack', {
                get() {
                    const vm = this as ComponentPublicInstance
                    return {
                        get canGoBack() {
                            const last = stack.entries[stack.entries.length - 1]
                            return !!last && last.depth > 0
                        },
                        get full() { return stack.entries },
                        get scoped() {
                            const entries = stack.entries as unknown as ScopedEntry[]
                            const root = getScopeRoot(vm, entries)
                            if (!root) {
                                return []
                            }

                            const [rootRec, rootIndex] = root
                            let reversed = entries.map(entry => entry).reverse()
                            const start = reversed.findIndex(entry => entry.matched[rootIndex] === rootRec && entry.matched[rootIndex + 1])
                            if (start < 0) {
                                return []
                            }

                            reversed = reversed.slice(start)
                            const end = reversed.findIndex(entry => entry.matched[rootIndex] !== rootRec || !entry.matched[rootIndex + 1])
                            if (end >= 0) {
                                reversed = reversed.slice(0, end)
                            }

                            return reversed
                                .reverse()
                                .map(entry => {
                                    const record = entry.matched[rootIndex + 1]
                                    return {
                                        ...entry,
                                        get record() { return record },
                                        get component() { return record.components && record.components.default }
                                    }
                                })
                        },
                        get appTriggered() {
                            return appTriggerN > 0
                        }
                    }
                }
            })
        }
    }
}
