import { abi, Transaction } from 'thor-devkit'
import { abis } from 'src/consts'
import { FeeMarket, GALACTICA_NODE_REQUIRED } from './fee-market'

export type EstimateGasResult = {
    caller: string
    gas: number
    reverted: boolean
    revertReason: string
    vmError: string
    feeMarket: FeeMarket
}

const defaultExplainGas = 2000 * 10000

export function calcExplainGas(suggestedGas: number): number {
    return suggestedGas > 0 ? suggestedGas : defaultExplainGas
}

async function getFeeMarket(thor: Connex.Thor): Promise<FeeMarket> {
    if (!thor.fees) {
        throw new Error(GALACTICA_NODE_REQUIRED)
    }

    try {
        const [history, priorityFee] = await Promise.all([
            thor.fees.history().count(1).get(),
            thor.fees.priorityFee()
        ])
        const baseFeePerGas = history.baseFeePerGas[history.baseFeePerGas.length - 1] || thor.status.head.baseFeePerGas
        if (!baseFeePerGas || !priorityFee) {
            throw new Error(GALACTICA_NODE_REQUIRED)
        }
        return { baseFeePerGas, priorityFee }
    } catch {
        throw new Error(GALACTICA_NODE_REQUIRED)
    }
}

export async function estimateGas(
    thor: Connex.Thor,
    clauses: Connex.VM.Clause[],
    suggestedGas: number,
    caller: string,
    gasPayer?: string
): Promise<EstimateGasResult> {
    const intrinsicGas = Transaction.intrinsicGas(clauses.map(item => {
        return {
            to: item.to,
            value: item.value || 0,
            data: item.data || '0x'
        }
    }))
    const offeredGas = calcExplainGas(suggestedGas)
    const explainer = thor.explain(clauses)
        .caller(caller)
        .gas(offeredGas)

    if (gasPayer) {
        explainer.gasPayer(gasPayer)
    }

    const outputs = await explainer.execute()

    let gas = suggestedGas
    if (!gas) {
        const execGas = outputs.reduce((sum, out) => sum + out.gasUsed, 0)
        gas = intrinsicGas + (execGas ? (execGas + 15000) : 0)
    }

    const feeMarket = await getFeeMarket(thor)
    const lastOutput = outputs.slice().pop()
    return {
        caller,
        gas,
        reverted: lastOutput ? lastOutput.reverted : false,
        revertReason: lastOutput ? (lastOutput.revertReason || '') : '',
        vmError: lastOutput ? lastOutput.vmError : '',
        feeMarket
    }
}

const TRANSFER_SIG = new abi.Function(abis.transfer).signature

export function decodeAsTokenTransferClause(clause: Connex.VM.Clause, spec: M.TokenSpec): { to: string, amount: string } | null {
    let { data, to } = clause
    data = data || ''
    to = to && to.toLowerCase()

    if (to === spec.address.toLowerCase() && data.startsWith(TRANSFER_SIG)) {
        try {
            const decoded = abi.decodeParameters(abis.transfer.inputs, '0x' + data.slice(TRANSFER_SIG.length))
            return {
                to: decoded._to,
                amount: decoded._value
            }
        } catch { }
    }
    return null
}
