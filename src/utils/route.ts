export function parseRouteInteger(value: string | undefined): number | null {
    if (!value || !/^\d+$/.test(value)) {
        return null
    }

    return Number.parseInt(value, 10)
}
