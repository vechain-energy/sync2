import { App, ComponentPublicInstance, WatchStopHandle } from 'vue'

type AsyncComputedState = {
    exception: unknown
    state: 'updating' | 'success' | 'error'
    updating: boolean
    success: boolean
    error: boolean
    updateRunId?: number
    update: () => void
}

type AsyncComputedItem = {
    get?: (this: AsyncComputedVm) => unknown
    default?: unknown
    shouldUpdate?: (this: AsyncComputedVm) => boolean
}

type AsyncComputedEntry = AsyncComputedItem | ((this: AsyncComputedVm) => unknown)

type AsyncComputedOptions = Record<string, AsyncComputedEntry>

type ComponentOptionsWithAsyncComputed = {
    asyncComputed?: AsyncComputedOptions
}

type AsyncComputedData = {
    _asyncComputed?: Record<string, AsyncComputedState>
    _asyncComputedStops?: WatchStopHandle[]
    _asyncComputedDestroyed?: boolean
}

type AsyncComputedVm = ComponentPublicInstance & Record<string, unknown> & {
    $data: AsyncComputedData
    $options: ComponentOptionsWithAsyncComputed
}

const didNotUpdate = Symbol('did-not-update')

function buildInitialData(vm: AsyncComputedVm): Record<string, unknown> & AsyncComputedData {
    const asyncComputed = vm.$options.asyncComputed
    if (!asyncComputed || Object.keys(asyncComputed).length === 0) {
        return {}
    }

    const data: Record<string, unknown> & AsyncComputedData = {
        _asyncComputed: {},
        _asyncComputedStops: [],
        _asyncComputedDestroyed: false
    }

    for (const [key, entry] of Object.entries(asyncComputed)) {
        data[key] = defaultValue(vm, entry)
    }

    return data
}

function entryGetter(entry: AsyncComputedEntry) {
    return typeof entry === 'function' ? entry : entry.get
}

function entryDefault(entry: AsyncComputedEntry) {
    return typeof entry === 'function' || !('default' in entry) ? null : entry.default
}

function defaultValue(vm: AsyncComputedVm, entry: AsyncComputedEntry) {
    const value = entryDefault(entry)
    return typeof value === 'function' ? (value as (this: AsyncComputedVm) => unknown).call(vm) : value
}

function setState(state: AsyncComputedState, next: AsyncComputedState['state']) {
    state.state = next
    state.updating = next === 'updating'
    state.success = next === 'success'
    state.error = next === 'error'
}

function resolveAsyncComputed(vm: AsyncComputedVm, key: string, entry: AsyncComputedEntry, runId: number, force = false) {
    const state = vm.$data._asyncComputed?.[key]
    const getter = entryGetter(entry)
    if (!state || !getter || vm.$data._asyncComputedDestroyed) {
        return runId
    }

    if (!force && typeof entry !== 'function' && entry.shouldUpdate && !entry.shouldUpdate.call(vm)) {
        return runId
    }

    const nextRunId = runId + 1
    setState(state, 'updating')

    Promise.resolve(getter.call(vm))
        .then(value => {
            if (state.updateRunId !== nextRunId || vm.$data._asyncComputedDestroyed) {
                return
            }
            vm[key] = value
            state.exception = null
            setState(state, 'success')
        })
        .catch((err: unknown) => {
            if (state.updateRunId !== nextRunId || vm.$data._asyncComputedDestroyed) {
                return
            }
            state.exception = err
            setState(state, 'error')
            console.error('Error evaluating async computed property:', err)
        })

    return nextRunId
}

export const AsyncComputed = {
    install(app: App) {
        app.config.optionMergeStrategies.asyncComputed = (to: AsyncComputedOptions | undefined, from: AsyncComputedOptions | undefined) => {
            return to ? Object.assign(Object.create(null), to, from) : from
        }

        app.mixin({
            data() {
                return buildInitialData(this as AsyncComputedVm)
            },
            created() {
                const vm = this as AsyncComputedVm
                const asyncComputed = vm.$options.asyncComputed
                if (!asyncComputed || Object.keys(asyncComputed).length === 0) {
                    return
                }

                vm.$data._asyncComputed = vm.$data._asyncComputed || {}
                vm.$data._asyncComputedStops = vm.$data._asyncComputedStops || []
                vm.$data._asyncComputedDestroyed = false

                for (const [key, entry] of Object.entries(asyncComputed)) {
                    let runId = 0
                    const state: AsyncComputedState = {
                        exception: null,
                        state: 'updating',
                        updating: true,
                        success: false,
                        error: false,
                        update: () => {
                            runId = resolveAsyncComputed(vm, key, entry, runId, true)
                            state.updateRunId = runId
                        }
                    }
                    vm.$data._asyncComputed[key] = state

                    const stop = vm.$watch(
                        () => {
                            if (typeof entry !== 'function' && entry.shouldUpdate && !entry.shouldUpdate.call(vm)) {
                                return didNotUpdate
                            }
                            const getter = entryGetter(entry)
                            return getter ? getter.call(vm) : null
                        },
                        value => {
                            if (value === didNotUpdate) {
                                return
                            }
                            const nextRunId = runId + 1
                            runId = nextRunId
                            state.updateRunId = nextRunId
                            setState(state, 'updating')
                            Promise.resolve(value)
                                .then(result => {
                                    if (state.updateRunId !== nextRunId || vm.$data._asyncComputedDestroyed) {
                                        return
                                    }
                                    vm[key] = result
                                    state.exception = null
                                    setState(state, 'success')
                                })
                                .catch((err: unknown) => {
                                    if (state.updateRunId !== nextRunId || vm.$data._asyncComputedDestroyed) {
                                        return
                                    }
                                    state.exception = err
                                    setState(state, 'error')
                                    console.error('Error evaluating async computed property:', err)
                                })
                        },
                        { immediate: true }
                    )

                    vm.$data._asyncComputedStops.push(stop)
                }
            },
            beforeUnmount() {
                const data = (this as AsyncComputedVm).$data
                data._asyncComputedDestroyed = true
                for (const stop of data._asyncComputedStops || []) {
                    stop()
                }
            },
            computed: {
                $asyncComputed() {
                    return (this as AsyncComputedVm).$data._asyncComputed || {}
                }
            }
        })
    }
}
