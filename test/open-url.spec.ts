/* eslint-env mocha */
import * as assert from 'assert'
import { isSafeExternalUrl } from '../src/utils/open-url'

describe('external URL helpers', () => {
    it('allows only http and https URLs', () => {
        assert.strictEqual(isSafeExternalUrl('https://example.com/path'), true)
        assert.strictEqual(isSafeExternalUrl('http://example.com/path'), true)
        assert.strictEqual(isSafeExternalUrl('javascript:alert(1)'), false)
        assert.strictEqual(isSafeExternalUrl('file:///etc/passwd'), false)
        assert.strictEqual(isSafeExternalUrl('not a url'), false)
    })
})
