import { abi } from 'thor-devkit'
import { BigNumber } from 'bignumber.js'
import { abis, genesises } from '../../consts'

export type GenericGasToken = 'VET' | 'B3TR' | 'VTHO'
export type GenericFeeMode = 'standard-vtho' | 'generic-vet' | 'generic-b3tr' | 'generic-vtho'
export type GenericDelegatorSpeed = 'regular' | 'medium' | 'high'

export type GenericDelegatorEstimate = {
    token: GenericGasToken
    speed: GenericDelegatorSpeed
    gas: number
    amount: string
    amountWei: string
    serviceFee: number
}

export type GenericDelegatorEstimateMap = {
    VET?: GenericDelegatorEstimate
    B3TR?: GenericDelegatorEstimate
    VTHO?: GenericDelegatorEstimate
}

export type GenericGasTokenBalanceMap = {
    VET?: string
    B3TR?: string
    VTHO?: string
}

export const STANDARD_FEE_MODE: GenericFeeMode = 'standard-vtho'
export const GENERIC_GAS_TOKENS: GenericGasToken[] = ['VET', 'B3TR', 'VTHO']

const GENERIC_DELEGATOR_URLS = {
    main: 'https://mainnet.delegator.vechain.org/api/v1/',
    test: 'https://testnet.delegator.vechain.org/api/v1/'
}

const VTHO_ADDRESS = '0x0000000000000000000000000000456e65726779'
const TRANSFER_SIG = new abi.Function(abis.transfer).signature

const B3TR_BY_NETWORK = {
    main: {
        address: '0x5ef79995fe8a89e0812330e4378eb2660cede699',
        iconSrc: 'https://vechain.github.io/token-registry/assets/5a9eb5e11751a649ca00298f3237c4624712af75.png'
    },
    test: {
        address: '0x95761346d18244bb91664181bf91193376197088',
        iconSrc: 'https://vechain.github.io/token-registry/assets/38b6a2fdff4c109128935762dc27853c773fef21.png'
    }
}

const TOKEN_ICON_SRC = {
    VET: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3077.png',
    VTHO: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3012.png'
}

type NetworkName = keyof typeof GENERIC_DELEGATOR_URLS
type GenericEstimateKey = 'vet' | 'b3tr' | 'vtho'

function networkOf(gid: string): NetworkName | null {
    const network = genesises.which(gid)
    return network === 'main' || network === 'test' ? network : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function numberField(source: Record<string, unknown>, key: string): number | null {
    const value = source[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function tokenKey(token: GenericGasToken): GenericEstimateKey {
    return token.toLowerCase() as GenericEstimateKey
}

export function genericFeeModeFor(token: GenericGasToken): GenericFeeMode {
    switch (token) {
        case 'VET': return 'generic-vet'
        case 'B3TR': return 'generic-b3tr'
        case 'VTHO': return 'generic-vtho'
    }
}

export function genericGasTokenFromFeeMode(mode: GenericFeeMode): GenericGasToken | null {
    switch (mode) {
        case 'generic-vet': return 'VET'
        case 'generic-b3tr': return 'B3TR'
        case 'generic-vtho': return 'VTHO'
        default: return null
    }
}

export function getGenericDelegatorUrl(gid: string): string | null {
    const network = networkOf(gid)
    return network ? GENERIC_DELEGATOR_URLS[network] : null
}

export function shouldShowGenericFeeOptions(gid: string, hasRequestDelegator: boolean): boolean {
    return !hasRequestDelegator && !!getGenericDelegatorUrl(gid)
}

export function genericDelegatorEstimateUrl(baseUrl: string, token: GenericGasToken, speed: GenericDelegatorSpeed): string {
    const url = new URL(`estimate/clauses/${token.toLowerCase()}`, baseUrl)
    url.searchParams.set('type', 'transaction')
    url.searchParams.set('speed', speed)
    return url.toString()
}

export function genericDelegatorDepositUrl(baseUrl: string): string {
    return new URL('deposit/account', baseUrl).toString()
}

export function genericDelegatorSignUrl(baseUrl: string, token: GenericGasToken): string {
    return new URL(`sign/transaction/${token.toLowerCase()}`, baseUrl).toString()
}

export function speedFromFeePriority(priority: number): GenericDelegatorSpeed {
    if (priority >= 200) {
        return 'high'
    }
    if (priority >= 150) {
        return 'medium'
    }
    return 'regular'
}

export function tokenAmountToWei(amount: BigNumber.Value, decimals: number): string {
    return new BigNumber(amount)
        .times(`1${'0'.repeat(decimals)}`)
        .toFixed(0, BigNumber.ROUND_CEIL)
}

export function parseGenericDelegatorEstimate(
    response: unknown,
    token: GenericGasToken,
    speed: GenericDelegatorSpeed
): GenericDelegatorEstimate {
    if (!isRecord(response)) {
        throw new Error('you need a valid Generic Delegator fee estimate')
    }

    const transactionCost = response.transactionCost
    const estimatedGas = response.estimatedGas
    const key = tokenKey(token)
    if (!isRecord(transactionCost) || !isRecord(estimatedGas)) {
        throw new Error('you need a valid Generic Delegator fee estimate')
    }

    const speedCost = transactionCost[speed]
    if (!isRecord(speedCost)) {
        throw new Error('you need a valid Generic Delegator fee estimate')
    }

    const amount = numberField(speedCost, key)
    const gas = numberField(estimatedGas, key)
    if (amount === null || gas === null) {
        throw new Error('you need a valid Generic Delegator fee estimate')
    }

    return {
        token,
        speed,
        gas,
        amount: amount.toString(),
        amountWei: tokenAmountToWei(amount, 18),
        serviceFee: numberField(response, 'serviceFee') || 0
    }
}

export function parseGenericDelegatorDepositAccount(response: unknown): string {
    if (!isRecord(response) || typeof response.depositAccount !== 'string' || !response.depositAccount) {
        throw new Error('you need a valid Generic Delegator deposit account')
    }
    return response.depositAccount
}

export function parseGenericDelegatorSignature(response: unknown): Buffer {
    if (!isRecord(response) || typeof response.signature !== 'string' || !/^0x[0-9a-f]{130}$/i.test(response.signature)) {
        throw new Error('you need a valid Generic Delegator signature')
    }
    return Buffer.from(response.signature.slice(2), 'hex')
}

export function getGenericGasTokenSpec(gid: string, tokens: M.TokenSpec[], token: GenericGasToken): M.TokenSpec | null {
    const current = tokens.find(spec => spec.gid === gid && spec.symbol === token)
    if (current) {
        return current
    }

    const network = networkOf(gid)
    if (!network) {
        return null
    }

    if (token === 'VET') {
        return {
            gid,
            name: 'VeChain',
            symbol: 'VET',
            address: '',
            decimals: 18,
            iconSrc: TOKEN_ICON_SRC.VET,
            permanent: true
        }
    }

    if (token === 'VTHO') {
        return {
            gid,
            name: 'VeChain Thor',
            symbol: 'VTHO',
            address: VTHO_ADDRESS,
            decimals: 18,
            iconSrc: TOKEN_ICON_SRC.VTHO,
            permanent: true
        }
    }

    return {
        gid,
        name: 'B3TR',
        symbol: 'B3TR',
        address: B3TR_BY_NETWORK[network].address,
        decimals: 18,
        iconSrc: B3TR_BY_NETWORK[network].iconSrc,
        permanent: false
    }
}

export function buildGenericDelegatorPaymentClause(
    token: GenericGasToken,
    tokenSpec: M.TokenSpec,
    depositAccount: string,
    amountWei: string
): Connex.Vendor.TxMessage[0] {
    if (token === 'VET') {
        return {
            to: depositAccount,
            value: amountWei,
            data: '0x',
            comment: `Generic Delegator fee ${amountWei} wei VET`
        }
    }

    const func = new abi.Function(abis.transfer)
    return {
        to: tokenSpec.address,
        value: 0,
        data: func.encode(depositAccount, amountWei),
        comment: `Generic Delegator fee ${amountWei} wei ${token}`
    }
}

function decodeTokenTransferClause(clause: Connex.VM.Clause, spec: M.TokenSpec): { amount: string } | null {
    let { data, to } = clause
    data = data || ''
    to = to && to.toLowerCase()

    if (to === spec.address.toLowerCase() && data.startsWith(TRANSFER_SIG)) {
        try {
            const decoded = abi.decodeParameters(abis.transfer.inputs, '0x' + data.slice(TRANSFER_SIG.length))
            return { amount: decoded._value }
        } catch { }
    }
    return null
}

export function calcGenericGasTokenRequiredBalance(
    clauses: Connex.Vendor.TxMessage,
    token: GenericGasToken,
    tokenSpec: M.TokenSpec,
    feeWei: string
): BigNumber {
    let required = new BigNumber(feeWei)
    for (const clause of clauses) {
        if (token === 'VET') {
            required = required.plus(clause.value || 0)
            continue
        }

        const transfer = decodeTokenTransferClause(clause, tokenSpec)
        if (transfer) {
            required = required.plus(transfer.amount)
        }
    }
    return required
}
