/* eslint-env mocha */
import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'

describe('transfer notifier guards', () => {
    it('parses stored range starts without accepting partial values', () => {
        const source = fs.readFileSync(path.join(__dirname, '..', 'src/pages/TransferNotifier.vue'), 'utf8')

        assert.ok(source.includes("import { parseStoredNonNegativeInteger } from 'src/utils/storage'"))
        assert.ok(source.includes('parseStoredNonNegativeInteger(savedRange, headNum)'))
        assert.strictEqual(source.includes('parseInt(savedRange!, 10)'), false)
    })
})
