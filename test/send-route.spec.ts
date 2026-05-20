/* eslint-env mocha */
import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'

function sourceFile(file: string) {
    return fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
}

describe('send route guards', () => {
    it('shows a recovery state when opened without wallet query context', () => {
        const source = sourceFile('src/pages/Send/Controller.vue')

        assert.ok(source.includes('v-if="canSend"'))
        assert.ok(source.includes('invalidContextMessage'))
        assert.ok(source.includes('send.msg_select_wallet'))
        assert.ok(source.includes('$backOrHome()'))
    })

    it('does not query wallets with invalid route query ids', () => {
        const source = sourceFile('src/pages/Send/Controller.vue')

        assert.ok(source.includes("import { parseRouteInteger } from 'src/utils/route'"))
        assert.ok(source.includes('parseRouteInteger'))
        assert.ok(source.includes('walletIdNumber'))
        assert.ok(source.includes('addressIndexNumber'))
        assert.ok(source.includes('return id === null ? Promise.resolve(null) : this.$svc.wallet.get(id)'))
    })

    it('recovers from stale route token symbols before sending', () => {
        const source = sourceFile('src/pages/Send/Controller.vue')

        assert.ok(source.includes('ensureSelectedToken()'))
        assert.ok(source.includes("this.tokenList.find(token => token.symbol === 'VET') || this.tokenList[0]"))
        assert.ok(source.includes('this.tokenList.length > 0 && !!this.currentToken'))
        assert.ok(source.includes('const token = this.currentToken'))
        assert.strictEqual(source.includes('this.currentToken!.decimals'), false)
    })
})
