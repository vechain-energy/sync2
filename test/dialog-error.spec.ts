/* eslint-env mocha */
import * as assert from 'assert'
import { dialogErrorMessage, isCancelledDialogError } from '../src/utils/dialog-error'

describe('dialog error helpers', () => {
    it('detects cancelled dialog errors', () => {
        assert.strictEqual(isCancelledDialogError(new Error('cancelled')), true)
        assert.strictEqual(isCancelledDialogError(new Error('network failed')), false)
        assert.strictEqual(isCancelledDialogError('cancelled'), false)
    })

    it('returns no visible message for cancelled dialogs', () => {
        assert.strictEqual(dialogErrorMessage(new Error('cancelled'), 'Fallback'), null)
        assert.strictEqual(dialogErrorMessage(new Error('network failed'), 'Fallback'), 'network failed')
        assert.strictEqual(dialogErrorMessage('network failed', 'Fallback'), 'Fallback')
    })
})
