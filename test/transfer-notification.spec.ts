/* eslint-env mocha */
import * as assert from 'assert'
import { transferNotification } from '../src/utils/transfer-notification'

describe('transfer notification helpers', () => {
    it('formats transfer notifications as plain text', () => {
        const notification = transferNotification(
            'in',
            '1000000000000000000',
            18,
            '<img src=x onerror=alert(1)>',
            { received: 'Received', sent: 'Sent' }
        )

        assert.strictEqual(notification.html, false)
        assert.strictEqual(notification.message, 'Received 1.00 <img src=x onerror=alert(1)>')
    })
})
