type TxPayload = {
    message: Connex.Vendor.TxMessage
    options: Connex.Signer.TxOptions
}

type CertPayload = {
    message: Connex.Vendor.CertMessage
    options: Connex.Signer.CertOptions
}

/** request relayed by TOS */
export type RelayedRequest = {
    gid: string // genesis id which to specify network
    origin?: string
} & ({
    type: 'tx'
    payload: TxPayload
} | {
    type: 'cert'
    payload: CertPayload
})

export namespace RelayedRequest {
    type UnknownRecord = Record<string, unknown>

    const gidPattern = /^0x[0-9a-f]{64}$/i
    const addressPattern = /^0x[0-9a-f]{40}$/i
    const txIdPattern = /^0x[0-9a-f]{64}$/i
    const dataPattern = /^0x[0-9a-f]*$/i
    const unsignedIntegerPattern = /^(0|[1-9]\d*)$/

    function fail(message: string): never {
        throw new Error(message)
    }

    function isRecord(value: unknown): value is UnknownRecord {
        return typeof value === 'object' && value !== null && !Array.isArray(value)
    }

    function requireRecord(value: unknown, label: string): UnknownRecord {
        if (!isRecord(value)) {
            fail(`${label} requires object type`)
        }
        return value
    }

    function requireString(value: unknown, label: string): string {
        if (typeof value !== 'string') {
            fail(`${label} requires string type`)
        }
        return value
    }

    function optionalString(value: unknown, label: string): string | undefined {
        if (value === undefined) {
            return undefined
        }
        return requireString(value, label)
    }

    function requirePattern(value: unknown, label: string, pattern: RegExp): string {
        const text = requireString(value, label)
        if (!pattern.test(text)) {
            fail(`invalid ${label}`)
        }
        return text
    }

    function requireHttpUrl(value: unknown, label: string): string {
        const text = requireString(value, label)
        try {
            const url = new URL(text)
            if (url.protocol === 'http:' || url.protocol === 'https:') {
                return text
            }
        } catch {
        }
        fail(`${label} requires http or https URL`)
    }

    function optionalAddress(value: unknown, label: string): string | undefined {
        return value === undefined ? undefined : requirePattern(value, label, addressPattern)
    }

    function optionalLink(value: unknown, label: string): string | undefined {
        return value === undefined ? undefined : requireHttpUrl(value, label)
    }

    function requireClauseValue(value: unknown): string | number {
        if (typeof value === 'number') {
            if (Number.isSafeInteger(value) && value >= 0) {
                return value
            }
            fail('value requires a non-negative safe integer')
        }
        const text = requireString(value, 'value')
        if (!unsignedIntegerPattern.test(text)) {
            fail('value requires a non-negative integer string')
        }
        return text
    }

    function validateClause(value: unknown, index: number): Connex.Vendor.TxMessage[0] {
        const clause = requireRecord(value, `message[${index}]`)
        const to = clause.to
        if (to !== null && (typeof to !== 'string' || !addressPattern.test(to))) {
            fail(`invalid message[${index}].to`)
        }

        const validated: Connex.Vendor.TxMessage[0] = {
            to,
            value: requireClauseValue(clause.value)
        }

        if (clause.data !== undefined) {
            validated.data = requirePattern(clause.data, `message[${index}].data`, dataPattern)
        }
        if (clause.comment !== undefined) {
            validated.comment = requireString(clause.comment, `message[${index}].comment`)
        }
        if (clause.abi !== undefined) {
            if (!isRecord(clause.abi)) {
                fail(`message[${index}].abi requires object type`)
            }
            validated.abi = clause.abi
        }
        return validated
    }

    function validateTxOptions(value: unknown): Connex.Signer.TxOptions {
        const input = requireRecord(value, 'options')
        const options: Connex.Signer.TxOptions = {}
        const signer = optionalAddress(input.signer, 'signer')
        if (signer) {
            options.signer = signer
        }
        if (input.gas !== undefined) {
            if (typeof input.gas !== 'number' || !Number.isSafeInteger(input.gas) || input.gas <= 0) {
                fail('gas requires a positive safe integer')
            }
            options.gas = input.gas
        }
        if (input.dependsOn !== undefined) {
            options.dependsOn = requirePattern(input.dependsOn, 'dependsOn', txIdPattern)
        }
        const link = optionalLink(input.link, 'link')
        if (link) {
            options.link = link
        }
        const comment = optionalString(input.comment, 'comment')
        if (comment) {
            options.comment = comment
        }
        if (input.delegator !== undefined) {
            const delegator = requireRecord(input.delegator, 'delegator')
            const delegatorSigner = optionalAddress(delegator.signer, 'delegator.signer')
            options.delegator = {
                url: requireHttpUrl(delegator.url, 'delegator.url')
            }
            if (delegatorSigner) {
                options.delegator.signer = delegatorSigner
            }
        }
        return options
    }

    function validateCertOptions(value: unknown): Connex.Signer.CertOptions {
        const input = requireRecord(value, 'options')
        const options: Connex.Signer.CertOptions = {}
        const signer = optionalAddress(input.signer, 'signer')
        if (signer) {
            options.signer = signer
        }
        const link = optionalLink(input.link, 'link')
        if (link) {
            options.link = link
        }
        return options
    }

    function validateTxPayload(value: unknown): TxPayload {
        const payload = requireRecord(value, 'payload')
        if (!Array.isArray(payload.message) || payload.message.length === 0) {
            fail('message requires a non-empty array')
        }
        return {
            message: payload.message.map(validateClause),
            options: validateTxOptions(payload.options)
        }
    }

    function validateCertPayload(value: unknown): CertPayload {
        const payload = requireRecord(value, 'payload')
        const message = requireRecord(payload.message, 'message')
        if (message.purpose !== 'identification' && message.purpose !== 'agreement') {
            fail('unsupported certificate purpose')
        }

        const certPayload = requireRecord(message.payload, 'message.payload')
        if (certPayload.type !== 'text') {
            fail('unsupported certificate payload type')
        }

        return {
            message: {
                purpose: message.purpose,
                payload: {
                    type: certPayload.type,
                    content: requireString(certPayload.content, 'message.payload.content')
                }
            },
            options: validateCertOptions(payload.options)
        }
    }

    export function validate(obj: unknown): RelayedRequest {
        const input = requireRecord(obj, 'request')
        const gid = requirePattern(input.gid, 'gid', gidPattern)
        const origin = optionalString(input.origin, 'origin')

        if (input.type === 'tx') {
            return {
                gid,
                origin,
                type: 'tx',
                payload: validateTxPayload(input.payload)
            }
        }
        if (input.type === 'cert') {
            return {
                gid,
                origin,
                type: 'cert',
                payload: validateCertPayload(input.payload)
            }
        }

        fail(`unsupported type '${String(input.type)}'`)
    }
}

/** response relayed by TOS */
export type RelayedResponse = {
    error?: string
    payload?: object
}

export type SignerGroup = {
    name: string
    addresses: string[]
}
