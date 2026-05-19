/* eslint-env mocha */
import * as assert from 'assert'
import { summarizeCertActivity } from '../src/pages/Activities/certificate'

describe('activity certificate helpers', () => {
    it('summarizes valid certificate activity content', () => {
        assert.deepStrictEqual(summarizeCertActivity(JSON.stringify({
            purpose: 'identification',
            payload: {
                type: 'text',
                content: 'Sign in'
            }
        })), {
            purpose: 'identification',
            content: 'Sign in'
        })
    })

    it('returns an empty summary for malformed certificate activity content', () => {
        assert.deepStrictEqual(summarizeCertActivity('not-json'), {
            purpose: null,
            content: ''
        })

        assert.deepStrictEqual(summarizeCertActivity(JSON.stringify({
            purpose: 'unsafe',
            payload: {}
        })), {
            purpose: null,
            content: ''
        })
    })
})
