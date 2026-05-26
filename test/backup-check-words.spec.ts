/* eslint-env mocha */
import * as assert from 'assert'
import {
    MNEMONIC_GROUP_SIZE,
    buildMnemonicChoiceIndexes
} from '../src/pages/Backup/check-words'

function words(length: number): string[] {
    return Array.from({ length }, (_item, index) => `word-${index}`)
}

describe('backup word verification helpers', () => {
    it('builds unique answer and distractor choices for each mnemonic group', () => {
        const choices = buildMnemonicChoiceIndexes(words(24), 2, () => 0)
        const unique = new Set(choices)

        assert.strictEqual(choices.length, MNEMONIC_GROUP_SIZE * 2)
        assert.strictEqual(unique.size, choices.length)
        for (const index of [6, 7, 8]) {
            assert.ok(unique.has(index))
        }
    })

    it('does not duplicate distractors when random keeps selecting the first item', () => {
        const choices = buildMnemonicChoiceIndexes(words(6), 0, () => 0)

        assert.deepStrictEqual([...choices].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5])
    })

    it('uses Math.random when no random source is provided', () => {
        const choices = buildMnemonicChoiceIndexes(words(6), 0)

        assert.strictEqual(choices.length, MNEMONIC_GROUP_SIZE * 2)
        assert.strictEqual(new Set(choices).size, choices.length)
    })
})
