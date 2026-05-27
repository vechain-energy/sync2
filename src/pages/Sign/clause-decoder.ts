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
    wrapperName: string
    target: string
    value: unknown
    operation?: unknown
    call: DecodedCall
    metaParams: DecodedParam[]
}

export type DecodedSmartWalletBatch = {
    kind: 'smart-wallet-batch'
    wrapperName: string
    instructions: DecodedSmartWalletInstruction[]
    metaParams: DecodedParam[]
}

export type DecodedClauseData = DecodedCall | DecodedSmartWalletInstruction | DecodedSmartWalletBatch

export type AbiResolver = (signature: string) => Promise<abi.Function.Definition | null>

type ClauseDataSource = {
    data?: string
    abi?: unknown
}

type SingleSmartWalletSpec = {
    kind: 'single'
    name: string
    inputTypes: string[]
    targetIndex: number
    valueIndex: number
    dataIndex: number
    operationIndex?: number
    metaIndexes: number[]
}

type BatchSmartWalletSpec = {
    kind: 'batch'
    name: string
    inputTypes: string[]
    targetIndex: number
    valueIndex: number
    dataIndex: number
    metaIndexes: number[]
}

type SmartWalletSpec = SingleSmartWalletSpec | BatchSmartWalletSpec

const smartWalletSpecs: SmartWalletSpec[] = [{
    kind: 'single',
    name: 'execute',
    inputTypes: ['address', 'uint256', 'bytes'],
    targetIndex: 0,
    valueIndex: 1,
    dataIndex: 2,
    metaIndexes: []
}, {
    kind: 'single',
    name: 'execute',
    inputTypes: ['address', 'uint256', 'bytes', 'uint256'],
    targetIndex: 0,
    valueIndex: 1,
    dataIndex: 2,
    operationIndex: 3,
    metaIndexes: []
}, {
    kind: 'single',
    name: 'executeWithAuthorization',
    inputTypes: ['address', 'uint256', 'bytes', 'uint256', 'uint256', 'bytes'],
    targetIndex: 0,
    valueIndex: 1,
    dataIndex: 2,
    metaIndexes: [3, 4, 5]
}, {
    kind: 'batch',
    name: 'executeBatch',
    inputTypes: ['address[]', 'uint256[]', 'bytes[]'],
    targetIndex: 0,
    valueIndex: 1,
    dataIndex: 2,
    metaIndexes: []
}, {
    kind: 'batch',
    name: 'executeBatchWithAuthorization',
    inputTypes: ['address[]', 'uint256[]', 'bytes[]', 'uint256', 'uint256', 'bytes32', 'bytes'],
    targetIndex: 0,
    valueIndex: 1,
    dataIndex: 2,
    metaIndexes: [3, 4, 5, 6]
}, {
    kind: 'batch',
    name: 'executeBatchWithCustomAuthorization',
    inputTypes: ['address[]', 'uint256[]', 'bytes[]', 'uint256', 'uint256', 'bytes32', 'bytes'],
    targetIndex: 0,
    valueIndex: 1,
    dataIndex: 2,
    metaIndexes: [3, 4, 5, 6]
}]

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

function findSmartWalletSpec(abiItem: abi.Function.Definition): SmartWalletSpec | null {
    const inputTypes = abiItem.inputs.map(input => input.type)
    return smartWalletSpecs.find(spec => {
        return abiItem.name === spec.name && spec.inputTypes.join(',') === inputTypes.join(',')
    }) || null
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
): Promise<DecodedSmartWalletInstruction | DecodedSmartWalletBatch | null> {
    const spec = findSmartWalletSpec(abiItem)
    if (!spec) {
        return null
    }

    if (spec.kind === 'batch') {
        return decodeSmartWalletBatch(spec, decodedCall, resolveAbi)
    }

    return decodeSmartWalletSingle(spec, decodedCall, resolveAbi)
}

async function decodeSmartWalletSingle(
    spec: SingleSmartWalletSpec,
    decodedCall: DecodedCall,
    resolveAbi: AbiResolver
): Promise<DecodedSmartWalletInstruction | null> {
    const targetParam = decodedCall.params[spec.targetIndex]
    const valueParam = decodedCall.params[spec.valueIndex]
    const dataParam = decodedCall.params[spec.dataIndex]
    const operationParam = spec.operationIndex === undefined ? null : decodedCall.params[spec.operationIndex]
    if (!targetParam || typeof targetParam.value !== 'string' || !dataParam || !hasCallableData(dataParam.value)) {
        return null
    }

    const innerCall = await decodeInnerCall(dataParam.value, resolveAbi)
    if (!innerCall) {
        return null
    }

    return {
        kind: 'smart-wallet-instruction',
        wrapperName: spec.name,
        target: targetParam.value,
        value: valueParam ? valueParam.value : '',
        operation: operationParam ? operationParam.value : undefined,
        call: innerCall,
        metaParams: spec.metaIndexes.map(index => decodedCall.params[index]).filter((param): param is DecodedParam => !!param)
    }
}

async function decodeInnerCall(innerData: string, resolveAbi: AbiResolver): Promise<DecodedCall | null> {
    const innerAbiItem = await resolveAbi(innerData.slice(0, 10))
    if (!innerAbiItem) {
        return null
    }

    return tryDecodeDataToReadable(innerAbiItem, innerData.slice(10))
}

function readArray(value: unknown): unknown[] | null {
    return Array.isArray(value) ? value : null
}

async function decodeSmartWalletBatch(
    spec: BatchSmartWalletSpec,
    decodedCall: DecodedCall,
    resolveAbi: AbiResolver
): Promise<DecodedSmartWalletBatch | null> {
    const targets = readArray(decodedCall.params[spec.targetIndex]?.value)
    const values = readArray(decodedCall.params[spec.valueIndex]?.value)
    const dataItems = readArray(decodedCall.params[spec.dataIndex]?.value)
    if (!targets || !values || !dataItems || targets.length !== dataItems.length) {
        return null
    }
    if (values.length !== 0 && values.length !== dataItems.length) {
        return null
    }

    const instructions: DecodedSmartWalletInstruction[] = []
    for (let i = 0; i < dataItems.length; i++) {
        const target = targets[i]
        const data = dataItems[i]
        if (typeof target !== 'string' || !hasCallableData(data)) {
            return null
        }

        const innerCall = await decodeInnerCall(data, resolveAbi)
        if (!innerCall) {
            return null
        }

        instructions.push({
            kind: 'smart-wallet-instruction',
            wrapperName: spec.name,
            target,
            value: values.length === 0 ? '0' : values[i],
            call: innerCall,
            metaParams: []
        })
    }

    if (instructions.length === 0) {
        return null
    }

    return {
        kind: 'smart-wallet-batch',
        wrapperName: spec.name,
        instructions,
        metaParams: spec.metaIndexes.map(index => decodedCall.params[index]).filter((param): param is DecodedParam => !!param)
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
