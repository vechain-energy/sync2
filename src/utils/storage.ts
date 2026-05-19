export function parseStoredNonNegativeInteger(value: string | null, fallback = 0): number {
    if (value === null || !/^\d+$/.test(value)) {
        return fallback
    }

    const parsed = Number(value)
    return Number.isSafeInteger(parsed) ? parsed : fallback
}
