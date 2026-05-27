import { abi } from 'thor-devkit'
import axios from 'axios'
import { isRecord, parseStoredJson } from 'src/utils/json'

export type DecodedParam = {
    name: string
    type: string
    value: unknown
}

export type DecodedCall = {
    kind: 'call'
    name: string
    params: DecodedParam[]
}

export type DecodedSmartWalletInstruction = {
    kind: 'smart-wallet-instruction'
    target: string
    value: unknown
    operation: unknown
    call: DecodedCall
}

export type DecodedClauseData = DecodedCall | DecodedSmartWalletInstruction

export type AbiResolver = (signature: string) => Promise<abi.Function.Definition | null>

type ClauseDataSource = {
    data?: string
    abi?: unknown
}

const smartWalletExecuteABI: abi.Function.Definition = {
    inputs: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'data', type: 'bytes' },
        { name: 'operation', type: 'uint256' }
    ],
    name: 'execute',
    outputs: [{ name: 'result', type: 'bytes' }],
    stateMutability: 'payable',
    type: 'function'
}

const smartWalletExecuteSignature = new abi.Function(smartWalletExecuteABI).signature

function readAbiDefinition(value: unknown): abi.Function.Definition | null {
    if (
        !isRecord(value) ||
        (value.type !== undefined && value.type !== 'function') ||
        typeof value.name !== 'string' ||
        !Array.isArray(value.inputs)
    ) {
        return null
    }

    return {
        ...value,
        inputs: value.inputs,
        outputs: Array.isArray(value.outputs) ? value.outputs : [],
        stateMutability: typeof value.stateMutability === 'string' ? value.stateMutability : 'nonpayable',
        type: 'function'
    } as abi.Function.Definition
}

function isSmartWalletExecuteABI(abiItem: abi.Function.Definition): boolean {
    if (abiItem.name !== smartWalletExecuteABI.name || new abi.Function(abiItem).signature !== smartWalletExecuteSignature) {
        return false
    }

    const inputTypes = abiItem.inputs.map(input => input.type)
    return inputTypes.join(',') === 'address,uint256,bytes,uint256'
}

function decodeDataToReadable(abiItem: abi.Function.Definition, data: string): DecodedCall {
    const decodedData = abi.decodeParameters(abiItem.inputs, `0x${data}`)
    return {
        kind: 'call',
        name: abiItem.name,
        params: abiItem.inputs.map((p, i) => {
            return {
                name: p.name,
                type: p.type,
                value: decodedData[i]
            }
        })
    }
}

function tryDecodeDataToReadable(abiItem: abi.Function.Definition, data: string): DecodedCall | null {
    try {
        return decodeDataToReadable(abiItem, data)
    } catch {
        return null
    }
}

function hasCallableData(data: unknown): data is string {
    return typeof data === 'string' && data.length > 10
}

async function decodeSmartWalletInstruction(
    abiItem: abi.Function.Definition,
    decodedCall: DecodedCall,
    resolveAbi: AbiResolver
): Promise<DecodedSmartWalletInstruction | null> {
    if (!isSmartWalletExecuteABI(abiItem)) {
        return null
    }

    const [targetParam, valueParam, dataParam, operationParam] = decodedCall.params
    if (!targetParam || typeof targetParam.value !== 'string' || !dataParam || !hasCallableData(dataParam.value)) {
        return null
    }

    const innerData = dataParam.value
    const innerAbiItem = await resolveAbi(innerData.slice(0, 10))
    if (!innerAbiItem) {
        return null
    }

    const innerCall = tryDecodeDataToReadable(innerAbiItem, innerData.slice(10))
    if (!innerCall) {
        return null
    }

    return {
        kind: 'smart-wallet-instruction',
        target: targetParam.value,
        value: valueParam ? valueParam.value : '',
        operation: operationParam ? operationParam.value : '',
        call: innerCall
    }
}

export async function queryAbi(signature: string): Promise<abi.Function.Definition | null> {
    const storedAbi = readAbiDefinition(parseStoredJson<unknown>(localStorage.getItem(signature) || '', null))
    if (storedAbi) {
        return storedAbi
    }

    try {
        const response = await axios.get(`https://b32.vecha.in/q/${signature}.json`, { timeout: 3 * 1000 })
        const abiItems = Array.isArray(response.data) ? response.data : []
        const abiItem = readAbiDefinition(abiItems[0])
        if (abiItem) {
            localStorage.setItem(signature, JSON.stringify(abiItem))
        }
        return abiItem
    } catch {
        return null
    }
}

export async function decodeClauseData(source: ClauseDataSource, resolveAbi: AbiResolver = queryAbi): Promise<DecodedClauseData | null> {
    if (!hasCallableData(source.data)) {
        return null
    }

    const signature = source.data.slice(0, 10)
    const data = source.data.slice(10)
    const hintedAbi = readAbiDefinition(source.abi)
    const abiItem = hintedAbi || await resolveAbi(signature)
    if (!abiItem) {
        return null
    }

    const decodedCall = tryDecodeDataToReadable(abiItem, data)
    if (!decodedCall) {
        return null
    }

    return await decodeSmartWalletInstruction(abiItem, decodedCall, resolveAbi) || decodedCall
}
