/* eslint-env mocha */
import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import { isSafeExternalUrl } from '../src/utils/open-url'

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
})
