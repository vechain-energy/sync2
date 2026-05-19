/* eslint-env mocha */
import * as assert from 'assert'
import { scrollDivider } from '../src/boot/directives'

type TestDirective = {
    inserted: (el: HTMLElement, binding: { modifiers: Record<string, boolean> }) => void
    unbind: (el: HTMLElement) => void
}

type GlobalWithWindow = {
    window?: unknown
}

class ListenerStore {
    private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()

    add(type: string, listener: EventListenerOrEventListenerObject) {
        const listeners = this.listeners.get(type) || new Set<EventListenerOrEventListenerObject>()
        listeners.add(listener)
        this.listeners.set(type, listeners)
    }

    remove(type: string, listener: EventListenerOrEventListenerObject) {
        const listeners = this.listeners.get(type)
        if (!listeners) {
            return
        }
        listeners.delete(listener)
    }

    count(type: string) {
        return this.listeners.get(type)?.size || 0
    }
}

class FakeScrollElement {
    readonly style = {
        borderTop: '',
        borderBottom: ''
    }

    readonly listenerStore = new ListenerStore()

    scrollTop = 0

    scrollHeight = 100

    clientHeight = 50

    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        this.listenerStore.add(type, listener)
    }

    removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        this.listenerStore.remove(type, listener)
    }
}

describe('scroll divider directive', () => {
    const directive = scrollDivider as unknown as TestDirective

    it('removes only its own window resize listener', () => {
        const globalScope = global as unknown as GlobalWithWindow
        const originalWindow = globalScope.window
        const windowListeners = new ListenerStore()
        globalScope.window = {
            addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
                windowListeners.add(type, listener)
            },
            removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
                windowListeners.remove(type, listener)
            }
        }

        try {
            const first = new FakeScrollElement()
            const second = new FakeScrollElement()
            directive.inserted(first as unknown as HTMLElement, { modifiers: {} })
            directive.inserted(second as unknown as HTMLElement, { modifiers: { both: true } })

            assert.strictEqual(windowListeners.count('resize'), 2)
            assert.strictEqual(first.listenerStore.count('scroll'), 1)
            assert.strictEqual(second.listenerStore.count('scroll'), 1)

            directive.unbind(first as unknown as HTMLElement)

            assert.strictEqual(windowListeners.count('resize'), 1)
            assert.strictEqual(first.listenerStore.count('scroll'), 0)
            assert.strictEqual(second.listenerStore.count('scroll'), 1)
        } finally {
            if (originalWindow) {
                globalScope.window = originalWindow
            } else {
                delete globalScope.window
            }
        }
    })
})
