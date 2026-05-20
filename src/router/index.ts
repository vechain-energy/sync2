import { defineRouter } from '@quasar/app-webpack/wrappers'
import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import routes from './routes'
import { createRouterStack } from './stack'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation
 */

export default defineRouter(function () {
    const Router = createRouter({
        scrollBehavior: () => ({ left: 0, top: 0 }),
        routes,
        history: process.env.VUE_ROUTER_MODE === 'history'
            ? createWebHistory(process.env.VUE_ROUTER_BASE)
            : createWebHashHistory(process.env.VUE_ROUTER_BASE)
    })

    Router.install = ((install) => (app) => {
        install.call(Router, app)
        app.use(createRouterStack(Router))
    })(Router.install)

    return Router
})
