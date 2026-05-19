import { address } from 'thor-devkit'

export const VET_DOMAIN_SUFFIXES = ['.vet', '.vet.domains']
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function normalizeVetDomainName(input: string): string {
    return input.trim().toLowerCase()
}

function isValidDomainLabel(label: string): boolean {
    return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label)
}

export function isVetDomainName(input: string): boolean {
    const normalized = normalizeVetDomainName(input)
    const suffix = VET_DOMAIN_SUFFIXES.find(item => normalized.endsWith(item))
    if (!suffix) {
        return false
    }

    const baseName = normalized.slice(0, -suffix.length)
    const labels = baseName.split('.')
    return labels.length > 0 && labels.every(isValidDomainLabel)
}

export function cleanResolvedAddress(input: string): string {
    if (!address.test(input) || input.toLowerCase() === ZERO_ADDRESS) {
        return ''
    }
    return address.toChecksumed(input)
}

export function cleanResolvedName(input: string): string {
    return isVetDomainName(input) ? normalizeVetDomainName(input) : ''
}
