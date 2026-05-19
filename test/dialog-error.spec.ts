/* eslint-env mocha */
import * as assert from 'assert'
import { isCancelledDialogError } from '../src/utils/dialog-error'

describe('dialog error helpers', () => {
    it('detects cancelled dialog errors', () => {
        assert.strictEqual(isCancelledDialogError(new Error('cancelled')), true)
        assert.strictEqual(isCancelledDialogError(new Error('network failed')), false)
        assert.strictEqual(isCancelledDialogError('cancelled'), false)
    })
})
