import { Transaction } from 'thor-devkit'
import { BigNumber } from 'bignumber.js'

export const GALACTICA_NODE_REQUIRED = 'you need to use a Galactica-compatible VeChain node'

export const FeePriority = {
    Regular: 100,
    Medium: 150,
    High: 200
}

export type FeeMarket = {
    baseFeePerGas: string
    priorityFee: string
}

export function calcPriorityFeePerGas(priorityFee: string, priority: number): BigNumber {
    return new BigNumber(priorityFee).times(priority).idiv(FeePriority.Regular)
}

export function calcCurrentFee(gas: number, baseFeePerGas: string, priorityFeePerGas: BigNumber): BigNumber {
    return new BigNumber(baseFeePerGas)
        .plus(priorityFeePerGas)
        .times(gas)
}

export function calcMaxFeePerGas(baseFeePerGas: string, priorityFeePerGas: BigNumber): BigNumber {
    return new BigNumber(baseFeePerGas)
        .times(2)
        .plus(priorityFeePerGas)
}

export function calcMaxFee(gas: number, maxFeePerGas: BigNumber): BigNumber {
    return maxFeePerGas.times(gas)
}

export function toHexQuantity(value: BigNumber): string {
    return '0x' + value.toString(16)
}

export function buildDynamicFeeTxBody(
    genesisId: string,
    blockId: string,
    clauses: Connex.Vendor.TxMessage,
    gas: number,
    maxPriorityFeePerGas: BigNumber,
    maxFeePerGas: BigNumber,
    dependsOn: string | undefined,
    nonce: string
): Transaction.DynamicFeeBody {
    return {
        type: Transaction.Type.DynamicFee,
        chainTag: Number.parseInt(genesisId.slice(-2), 16),
        blockRef: blockId.slice(0, 18),
        expiration: 18,
        clauses: clauses.map(item => {
            return {
                to: item.to,
                value: toHexQuantity(new BigNumber(item.value || 0)),
                data: item.data || '0x'
            }
        }),
        maxPriorityFeePerGas: toHexQuantity(maxPriorityFeePerGas),
        maxFeePerGas: toHexQuantity(maxFeePerGas),
        gas,
        dependsOn: dependsOn || null,
        nonce
    }
}
