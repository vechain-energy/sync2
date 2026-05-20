export function parseStoredJson<T>(value: string, fallback: T): T {
    if (!value) {
        return fallback
    }
    try {
        return JSON.parse(value) as T
    } catch {
        return fallback
    }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseStoredRecord(value: string): Record<string, unknown> {
    const parsed = parseStoredJson<unknown>(value, null)
    return isRecord(parsed) ? parsed : {}
}
