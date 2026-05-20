/* eslint-env mocha */
import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'

describe('index template startup forwarding', () => {
    it('checks the stored forward URL protocol before redirecting', () => {
        const template = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8')

        assert.ok(template.includes('forwardUrl.protocol === \'http:\' || forwardUrl.protocol === \'https:\''))
        assert.ok(!template.includes('location.href = new URL(location.hash, forward).href'))
    })
})
