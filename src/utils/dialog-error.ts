export function isCancelledDialogError(err: unknown): boolean {
    return err instanceof Error && err.message === 'cancelled'
}

export function dialogErrorMessage(err: unknown, fallbackMessage: string): string | null {
    if (isCancelledDialogError(err)) {
        return null
    }
    return err instanceof Error && err.message ? err.message : fallbackMessage
}
