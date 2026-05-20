import AsyncComputed from 'vue-async-computed'
import { App } from 'vue'
import { createGtag } from 'vue-gtag'

export function boot(app: App) {
    app.use(AsyncComputed)

    if (process.env.PROD) {
        app.use(createGtag({
            tagId: 'G-6QEHC6TLQV'
        }))
    }
}
