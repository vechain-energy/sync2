import { formatAmount } from './format'

type TransferDirection = 'in' | 'out'

export type TransferNotificationCopy = {
    received: string
    sent: string
}

export type TransferNotification = {
    message: string
    html: false
}

export function transferNotification(
    dir: TransferDirection,
    amount: string,
    decimals: number,
    symbol: string,
    copy: TransferNotificationCopy
): TransferNotification {
    const parts = formatAmount(amount, { unit: decimals, fixed: 2, fullPrecision: true })!
    const displayAmount = `${parts.int}${parts.sep}${parts.dec}`
    const verb = dir === 'in' ? copy.received : copy.sent

    return {
        message: `${verb} ${displayAmount} ${symbol}`,
        html: false
    }
}
