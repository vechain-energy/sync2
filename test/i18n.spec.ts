/* eslint-env mocha */
import * as assert from 'assert'
import bootI18n, { i18n } from '../src/boot/i18n'
import messages from '../src/i18n'

describe('i18n boot helper', () => {
    it('registers the shared i18n instance with app messages', () => {
        let installed = false
        const app = {
            use: (plugin: unknown) => {
                installed = plugin === i18n
            }
        }

        bootI18n({ app } as Parameters<typeof bootI18n>[0])

        assert.strictEqual(installed, true)
        assert.strictEqual(i18n.global.locale, 'en-us')
        assert.strictEqual(messages['en-us'].common.ok, 'OK')
        assert.strictEqual(messages['zh-cn'].common.ok, '\u786e\u5b9a')
    })
})
