export const MIN_PASSWORD_LEN = 6

export type NewPasswordInputError = '' | 'too-short' | 'mismatch'

export function validateNewPasswordInput(inputValue: string, password = ''): NewPasswordInputError {
    if (password) {
        return inputValue === password ? '' : 'mismatch'
    }
    return inputValue.length >= MIN_PASSWORD_LEN ? '' : 'too-short'
}
