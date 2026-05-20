import { Plugin } from 'vue'

export type AsyncComputedGetter<T> = () => Promise<T>;

export interface IAsyncComputedValue<T> {
    default?: T | (() => T)
    watch?: string[] | (() => void)
    shouldUpdate?: () => boolean
    lazy?: boolean
    get: AsyncComputedGetter<T>
}

export type AsyncComputedObject<T = Record<string, unknown>> = {
    [K in keyof T]: AsyncComputedGetter<T[K]> | IAsyncComputedValue<T[K]>;
}

export interface IASyncComputedState {
    state: 'updating' | 'success' | 'error'
    updating: boolean
    success: boolean
    error: boolean
    exception: Error | null
    update: () => void
}

declare module 'vue' {
    interface ComponentCustomOptions {
        asyncComputed?: AsyncComputedObject;
    }

    interface ComponentCustomProperties {
        $asyncComputed: Record<string, IASyncComputedState>
    }
}

declare const AsyncComputed: Plugin

export default AsyncComputed
