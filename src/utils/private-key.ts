import { address, secp256k1 } from 'thor-devkit'

const HEX_PRIVATE_KEY = /^[0-9a-f]{64}$/

export function normalizePrivateKey(input: string): string {
    const value = input.trim().toLowerCase()
    return value.startsWith('0x') ? value.slice(2) : value
}

export function parsePrivateKey(input: string): Buffer {
    const hex = normalizePrivateKey(input)
    if (!HEX_PRIVATE_KEY.test(hex)) {
        throw new Error('invalid private key')
    }

    const privateKey = Buffer.from(hex, 'hex')
    try {
        secp256k1.derivePublicKey(privateKey)
        return privateKey
    } catch {
        throw new Error('invalid private key')
    }
}

export function isPrivateKey(input: string): boolean {
    try {
        parsePrivateKey(input)
        return true
    } catch {
        return false
    }
}

export function formatPrivateKey(privateKey: Buffer): string {
    secp256k1.derivePublicKey(privateKey)
    return `0x${privateKey.toString('hex')}`
}

export function privateKeyToAddress(privateKey: Buffer): string {
    return address.fromPublicKey(secp256k1.derivePublicKey(privateKey))
}
