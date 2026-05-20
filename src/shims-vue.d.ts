// Mocks all files ending in `.vue` showing them as plain Vue instances
declare module '*.vue' {
    import { DefineComponent } from 'vue'
    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
    export default component
}

declare global {
    type Vue = import('vue').ComponentPublicInstance
}

declare module 'vue' {
    interface ComponentCustomProperties {
        $on(event: string | string[], fn: Function): this
        $once(event: string, fn: Function): this
        $off(event?: string | string[], fn?: Function): this
        $listeners: Record<string, Function | Function[]>
        $scopedSlots: Record<string, Function>
    }
}

export {}
