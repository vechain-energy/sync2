import { App, reactive } from 'vue'

type State = {
    app: {
        updateAvailable: boolean
        updateReleaseUrl: string
    }
}

declare module 'vue' {
    interface ComponentCustomProperties {
        $state: State
    }
}

declare global {
    interface Window {
        readonly AppState: State['app']
    }
}

export function boot(app: App) {
    const state = reactive<State>({
        app: {
            updateAvailable: false,
            updateReleaseUrl: ''
        }
    })

    Object.defineProperty(app.config.globalProperties, '$state', {
        get() { return state }
    })

    Object.defineProperty(window, 'AppState', {
        get() { return state.app }
    })
}
