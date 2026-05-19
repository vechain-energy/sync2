export function isCancelledDialogError(err: unknown): boolean {
    return err instanceof Error && err.message === 'cancelled'
}
