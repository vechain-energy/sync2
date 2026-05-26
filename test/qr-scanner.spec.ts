/* eslint-env mocha */
import * as assert from 'assert'
import { QrScanner } from '../src/utils/qr-scanner'

describe('QR scanner helper', () => {
    it('re-exports the QR scanner constructor', () => {
        assert.strictEqual(typeof QrScanner, 'function')
    })
})
