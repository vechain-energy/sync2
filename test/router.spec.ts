/* eslint-env mocha */
import * as assert from 'assert'
import * as Module from 'module'

type ModuleWithLoad = typeof Module & {
    _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown
}

type FakeRouter = {
    install: (app: FakeApp) => void
    history?: { kind: string, base?: string }
    routes?: unknown[]
    scrollBehavior?: () => { left: number; top: number }
}

type FakeApp = {
    used: string[]
    use: (plugin: { name: string }) => void
}

function restoreEnv(name: string, value: string | undefined) {
    if (value === undefined) {
        delete process.env[name]
        return
    }
    process.env[name] = value
}

describe('router boot helper', () => {
    it('creates hash and history routers with stack install wrapping', () => {
        const moduleWithLoad = require('module') as ModuleWithLoad
        const originalLoad = moduleWithLoad._load
        const previousMode = process.env.VUE_ROUTER_MODE
        const previousBase = process.env.VUE_ROUTER_BASE
        const routerModulePath = require.resolve('../src/router')

        moduleWithLoad._load = (request, parent, isMain) => {
            if (request === '@quasar/app-webpack/wrappers') {
                return {
                    defineRouter: (factory: () => FakeRouter) => factory
                }
            }
            if (request === 'vue-router') {
                return {
                    createRouter: (options: { history: { kind: string, base?: string }, routes: unknown[], scrollBehavior: () => { left: number; top: number } }) => ({
                        history: options.history,
                        routes: options.routes,
                        scrollBehavior: options.scrollBehavior,
                        install: (app: FakeApp) => {
                            app.used.push('router')
                        }
                    }),
                    createWebHashHistory: (base?: string) => ({ kind: 'hash', base }),
                    createWebHistory: (base?: string) => ({ kind: 'history', base })
                }
            }
            if (request === './routes') {
                return {
                    __esModule: true,
                    default: [{ path: '/' }]
                }
            }
            if (request === './stack') {
                return {
                    createRouterStack: () => ({ name: 'stack' })
                }
            }

            return originalLoad(request, parent, isMain)
        }

        try {
            delete require.cache[routerModulePath]
            process.env.VUE_ROUTER_BASE = '/wallet/'
            delete process.env.VUE_ROUTER_MODE

            const createAppRouter = require('../src/router').default as () => FakeRouter
            const hashRouter = createAppRouter()
            const hashApp: FakeApp = {
                used: [],
                use: plugin => {
                    hashApp.used.push(plugin.name)
                }
            }

            hashRouter.install(hashApp)
            assert.deepStrictEqual(hashRouter.history, { kind: 'hash', base: '/wallet/' })
            assert.deepStrictEqual(hashRouter.scrollBehavior?.(), { left: 0, top: 0 })
            assert.deepStrictEqual(hashApp.used, ['stack', 'router'])

            process.env.VUE_ROUTER_MODE = 'history'
            const historyRouter = createAppRouter()
            assert.deepStrictEqual(historyRouter.history, { kind: 'history', base: '/wallet/' })
        } finally {
            moduleWithLoad._load = originalLoad
            restoreEnv('VUE_ROUTER_MODE', previousMode)
            restoreEnv('VUE_ROUTER_BASE', previousBase)
            delete require.cache[routerModulePath]
        }
    })
})
