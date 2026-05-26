/* eslint-env mocha */
import * as assert from 'assert'
import * as fs from 'fs'
import * as Module from 'module'
import * as path from 'path'
import { isSafeExternalUrl, openURL } from '../src/utils/open-url'

type QuasarModule = {
    openURL: (url: string) => void
}

type ModuleWithLoad = typeof Module & {
    _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown
}

function restoreMode(value: string | undefined) {
    if (value === undefined) {
        delete process.env.MODE
        return
    }
    process.env.MODE = value
}

describe('external URL helpers', () => {
    it('allows only http and https URLs', () => {
        assert.strictEqual(isSafeExternalUrl('https://example.com/path'), true)
        assert.strictEqual(isSafeExternalUrl('http://example.com/path'), true)
        assert.strictEqual(isSafeExternalUrl('javascript:alert(1)'), false)
        assert.strictEqual(isSafeExternalUrl('file:///etc/passwd'), false)
        assert.strictEqual(isSafeExternalUrl('not a url'), false)
    })

    it('opens Electron URLs through the system shell', () => {
        const source = fs.readFileSync(path.join(__dirname, '..', 'src/utils/open-url.ts'), 'utf8')

        assert.ok(source.includes("require('@electron/remote') as ElectronRemote"))
        assert.ok(source.includes('remote.shell.openExternal(url)'))
    })

    it('blocks unsafe URLs before opening platform handlers', () => {
        assert.strictEqual(openURL('javascript:alert(1)'), false)
    })

    it('opens browser URLs through Quasar', () => {
        const quasar = require('quasar') as QuasarModule
        const originalOpen = quasar.openURL
        const previousMode = process.env.MODE
        let opened = ''

        quasar.openURL = url => {
            opened = url
        }
        delete process.env.MODE

        try {
            assert.strictEqual(openURL('https://example.com/path'), true)
            assert.strictEqual(opened, 'https://example.com/path')
        } finally {
            quasar.openURL = originalOpen
            restoreMode(previousMode)
        }
    })

    it('opens Cordova URLs through the system browser', () => {
        const previousMode = process.env.MODE
        const globalScope = global as typeof global & {
            cordova?: {
                InAppBrowser: InAppBrowser
            }
        }
        let opened = ''
        let target = ''

        process.env.MODE = 'cordova'
        const browser = {
            open: (url: string, nextTarget?: string) => {
                opened = url
                target = nextTarget || ''
                return browser
            },
            onloadstart: () => {},
            onloadstop: () => {},
            onloaderror: () => {},
            onexit: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            close: () => {},
            hide: () => {},
            show: () => {},
            executeScript: () => {},
            insertCSS: () => {}
        }
        globalScope.cordova = {
            InAppBrowser: browser
        } as unknown as Cordova

        try {
            assert.strictEqual(openURL('https://example.com/app'), true)
            assert.strictEqual(opened, 'https://example.com/app')
            assert.strictEqual(target, '_system')
        } finally {
            delete globalScope.cordova
            restoreMode(previousMode)
        }
    })

    it('opens Electron URLs through remote shell', () => {
        const previousMode = process.env.MODE
        const moduleWithLoad = require('module') as ModuleWithLoad
        const originalLoad = moduleWithLoad._load
        let opened = ''

        process.env.MODE = 'electron'
        moduleWithLoad._load = (request, parent, isMain) => {
            if (request === '@electron/remote') {
                return {
                    shell: {
                        openExternal: (url: string) => {
                            opened = url
                            return Promise.resolve()
                        }
                    }
                }
            }

            return originalLoad(request, parent, isMain)
        }

        try {
            assert.strictEqual(openURL('https://example.com/electron'), true)
            assert.strictEqual(opened, 'https://example.com/electron')
        } finally {
            moduleWithLoad._load = originalLoad
            restoreMode(previousMode)
        }
    })
})
