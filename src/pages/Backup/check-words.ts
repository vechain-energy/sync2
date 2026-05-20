export const MNEMONIC_GROUP_SIZE = 3

function shuffled<T>(items: T[], random: () => number): T[] {
    return items
        .map(item => ({ item, order: random() }))
        .sort((left, right) => left.order - right.order)
        .map(({ item }) => item)
}

export function buildMnemonicChoiceIndexes(
    words: readonly string[],
    groupIndex: number,
    random: () => number = Math.random
): number[] {
    const start = groupIndex * MNEMONIC_GROUP_SIZE
    const answers = words
        .map((_word, index) => index)
        .slice(start, start + MNEMONIC_GROUP_SIZE)

    const pool = words
        .map((_word, index) => index)
        .filter(index => !answers.includes(index))
    const distractors: number[] = []

    while (distractors.length < answers.length && pool.length > 0) {
        const index = Math.min(Math.floor(random() * pool.length), pool.length - 1)
        distractors.push(pool.splice(index, 1)[0])
    }

    return shuffled([...answers, ...distractors], random)
}
