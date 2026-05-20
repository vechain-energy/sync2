export function sanitizeDecimalInput(value: string, decimals?: number): string {
    let result = ''
    let hasDecimal = false
    let decimalPlaces = 0

    for (const char of value) {
        if (char >= '0' && char <= '9') {
            if (hasDecimal) {
                if (typeof decimals === 'number' && decimalPlaces >= decimals) {
                    continue
                }
                decimalPlaces++
            }
            result += char
            continue
        }

        if (char === '.' && !hasDecimal) {
            hasDecimal = true
            result += char
        }
    }

    return result
}
