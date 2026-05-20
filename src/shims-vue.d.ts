// Mocks all files ending in `.vue` showing them as plain Vue instances
declare module '*.vue' {
    import { DefineComponent } from 'vue'
    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
    export default component
}

declare global {
    type Vue = import('vue').ComponentPublicInstance
}

export {}
