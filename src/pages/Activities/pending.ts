import { parseStoredTx } from '../ActivityStatusUpdater/status'

export type TxActivity = M.Activity & {
    type: 'tx'
    glob: M.Activity.TxGlob
}

export function uncompletedTxActivities(activities: M.Activity[]): TxActivity[] {
    return activities.filter((activity): activity is TxActivity => {
        return activity.type === 'tx' && activity.status !== 'completed'
    })
}

export function isPendingTxActivity(activity: M.Activity, headNumber: number): activity is TxActivity {
    if (activity.type !== 'tx' || activity.status === 'completed' || activity.glob.receipt) {
        return false
    }

    const storedTx = parseStoredTx(activity.glob.encoded)
    return !!storedTx && headNumber <= storedTx.expiresAfterBlock
}

export function countPendingTxActivities(activities: M.Activity[], headNumberOf: (activity: TxActivity) => number): number {
    return activities.reduce((total, activity) => {
        if (activity.type !== 'tx') {
            return total
        }
        return total + (isPendingTxActivity(activity, headNumberOf(activity)) ? 1 : 0)
    }, 0)
}
