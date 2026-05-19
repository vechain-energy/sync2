import { parseStoredJson } from 'src/utils/json'

type CertPurpose = 'identification' | 'agreement'
type CertActivitySummary = {
    purpose: CertPurpose | null
    content: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function readPurpose(value: unknown): CertPurpose | null {
    return value === 'identification' || value === 'agreement' ? value : null
}

export function summarizeCertActivity(encoded: string): CertActivitySummary {
    const cert = parseStoredJson<unknown>(encoded, null)
    if (!isRecord(cert)) {
        return { purpose: null, content: '' }
    }

    const payload = cert.payload
    return {
        purpose: readPurpose(cert.purpose),
        content: isRecord(payload) && typeof payload.content === 'string' ? payload.content : ''
    }
}
