/* eslint-env mocha */
import * as assert from 'assert'
import bootDirectives, { scrollDivider } from '../src/boot/directives'

type TestDirective = {
    mounted: (el: HTMLElement, binding: { modifiers: Record<string, boolean> }) => void
    updated?: (el: HTMLElement, binding: { value: boolean | undefined }) => void
    unmounted: (el: HTMLElement) => void
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

    get(type: string) {
        return this.listeners.get(type) || new Set<EventListenerOrEventListenerObject>()
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

class FakeNode {
    parent: FakeElement | null = null
}

class FakeElement extends FakeNode {
    tabIndex = 0
    focused = false
    removed = false
    readonly children: FakeNode[] = []
    readonly listenerStore = new ListenerStore()

    appendChild(child: FakeNode) {
        child.parent = this
        this.children.push(child)
    }

    contains(node: Node | FakeNode) {
        return this.children.includes(node as FakeNode)
    }

    focus() {
        this.focused = true
    }

    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        this.listenerStore.add(type, listener)
    }

    removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        this.listenerStore.remove(type, listener)
    }

    dispatchFocusout(relatedTarget: FakeNode | null) {
        for (const listener of this.listenerStore.get('focusout')) {
            if (typeof listener === 'function') {
                listener({ relatedTarget } as unknown as FocusEvent)
            } else {
                listener.handleEvent({ relatedTarget } as unknown as FocusEvent)
            }
        }
    }

    getElementsByClassName(name: string) {
        return name === 'q-focus-helper'
            ? [{
                remove: () => {
                    this.removed = true
                }
            }]
            : []
    }
}

class EmptyClassElement extends FakeElement {
    getElementsByClassName() {
        return []
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
            directive.mounted(first as unknown as HTMLElement, { modifiers: {} })
            directive.mounted(second as unknown as HTMLElement, { modifiers: { both: true } })

            assert.strictEqual(windowListeners.count('resize'), 2)
            assert.strictEqual(first.listenerStore.count('scroll'), 1)
            assert.strictEqual(second.listenerStore.count('scroll'), 1)

            directive.unmounted(first as unknown as HTMLElement)
            directive.unmounted(first as unknown as HTMLElement)

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

    it('draws bottom dividers from scroll position', () => {
        const globalScope = global as unknown as GlobalWithWindow
        const originalWindow = globalScope.window
        globalScope.window = {
            addEventListener: () => {},
            removeEventListener: () => {}
        }

        try {
            const el = new FakeScrollElement()
            el.scrollTop = 25
            el.scrollHeight = 200
            el.clientHeight = 100
            directive.mounted(el as unknown as HTMLElement, { modifiers: { bottom: true } })

            assert.strictEqual(el.style.borderBottom, '1px solid rgba(0,0,0,0.12)')
            assert.strictEqual(el.style.borderTop, '1px solid rgba(0,0,0,0.06)')
        } finally {
            if (originalWindow) {
                globalScope.window = originalWindow
            } else {
                delete globalScope.window
            }
        }
    })
})

describe('shared directives boot helper', () => {
    it('registers focus and helper directives', () => {
        const registered: Record<string, TestDirective & { mounted: (el: HTMLElement) => void }> = {}
        bootDirectives({
            app: {
                directive: (name: string, definition: unknown) => {
                    registered[name] = definition as TestDirective & { mounted: (el: HTMLElement) => void }
                }
            }
        } as Parameters<typeof bootDirectives>[0])

        assert.ok(registered.scrollDivider)
        assert.ok(registered.nofocusout)
        assert.ok(registered.disableFocusHelper)
    })

    it('keeps focus inside elements until disabled or unmounted', () => {
        const globalScope = global as typeof global & { Node?: typeof Node }
        const originalNode = globalScope.Node
        const registered: Record<string, TestDirective> = {}
        bootDirectives({
            app: {
                directive: (name: string, definition: unknown) => {
                    registered[name] = definition as TestDirective
                }
            }
        } as Parameters<typeof bootDirectives>[0])

        globalScope.Node = FakeNode as unknown as typeof Node

        try {
            const el = new FakeElement()
            const child = new FakeNode()
            const outside = new FakeNode()
            el.appendChild(child)

            registered.nofocusout.mounted(el as unknown as HTMLElement, { modifiers: {} })
            assert.strictEqual(el.tabIndex, -1)
            assert.strictEqual(el.listenerStore.count('focusout'), 1)

            el.dispatchFocusout(child)
            assert.strictEqual(el.focused, false)

            el.dispatchFocusout(outside)
            assert.strictEqual(el.focused, true)

            el.focused = false
            registered.nofocusout.updated!(el as unknown as HTMLElement, { value: false })
            el.dispatchFocusout(outside)
            assert.strictEqual(el.focused, false)

            registered.nofocusout.unmounted(el as unknown as HTMLElement)
            registered.nofocusout.unmounted(el as unknown as HTMLElement)
            assert.strictEqual(el.listenerStore.count('focusout'), 0)
        } finally {
            if (originalNode) {
                globalScope.Node = originalNode
            } else {
                delete globalScope.Node
            }
        }
    })

    it('removes Quasar focus helper nodes when present', () => {
        const registered: Record<string, TestDirective & { mounted: (el: HTMLElement) => void }> = {}
        bootDirectives({
            app: {
                directive: (name: string, definition: unknown) => {
                    registered[name] = definition as TestDirective & { mounted: (el: HTMLElement) => void }
                }
            }
        } as Parameters<typeof bootDirectives>[0])

        const el = new FakeElement()
        const empty = new EmptyClassElement()

        registered.disableFocusHelper.mounted(el as unknown as HTMLElement)
        registered.disableFocusHelper.mounted(empty as unknown as HTMLElement)

        assert.strictEqual(el.removed, true)
        assert.strictEqual(empty.removed, false)
    })
})
