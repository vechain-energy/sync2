import { abi, keccak256 } from 'thor-devkit'
import { BigNumber } from 'bignumber.js'
import { genesises } from '../consts'

export const VET_DOMAIN_REGISTRATION_YEAR_SECONDS = 31536000

export type VetDomainContracts = {
    registry: string
    controller: string
    resolver: string
}

export type VetDomainPrice = {
    base: string
    premium: string
}

export type VetDomainRegistrationInfo = {
    name: string
    duration: number
    available: boolean
    valid: boolean
    minCommitmentAge: number
    maxCommitmentAge: number
    price: VetDomainPrice
}

export type VetDomainCommitmentParams = {
    name: string
    owner: string
    duration: number
    secret: string
    resolver: string
    setAsPrimary: boolean
}

export const VET_DOMAIN_CONTRACTS_BY_GID: Record<string, VetDomainContracts> = {
    [genesises.main.id]: {
        registry: '0xa9231da8BF8D10e2df3f6E03Dd5449caD600129b',
        controller: '0x07479F2710d16a0bACbE6C25b9b32447364C0A33',
        resolver: '0xabac49445584C8b6c1472b030B1076Ac3901D7cf'
    },
    [genesises.test.id]: {
        registry: '0xcBFB30c1F267914816668d53AcBA7bA7c9806D13',
        controller: '0xAA854565401724f7061E0C366cA132c87C1e5F60',
        resolver: '0xA6eFd130085a127D090ACb0b100294aD1079EA6f'
    }
}

export const vetDomainAvailableABI: abi.Function.Definition = {
    constant: true,
    inputs: [{ name: 'name', type: 'string' }],
    name: 'available',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
}

export const vetDomainValidABI: abi.Function.Definition = {
    constant: true,
    inputs: [{ name: 'name', type: 'string' }],
    name: 'valid',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'pure',
    type: 'function'
}

export const vetDomainRentPriceABI: abi.Function.Definition = {
    constant: true,
    inputs: [
        { name: 'name', type: 'string' },
        { name: 'duration', type: 'uint256' }
    ],
    name: 'rentPrice',
    outputs: [{
        name: '',
        type: 'tuple',
        components: [
            { name: 'base', type: 'uint256' },
            { name: 'premium', type: 'uint256' }
        ]
    }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
}

export const vetDomainMinCommitmentAgeABI: abi.Function.Definition = {
    constant: true,
    inputs: [],
    name: 'minCommitmentAge',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
}

export const vetDomainMaxCommitmentAgeABI: abi.Function.Definition = {
    constant: true,
    inputs: [],
    name: 'maxCommitmentAge',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
}

export const vetDomainMakeCommitmentABI: abi.Function.Definition = {
    constant: true,
    inputs: [
        { name: 'name', type: 'string' },
        { name: 'owner', type: 'address' },
        { name: 'duration', type: 'uint256' },
        { name: 'secret', type: 'bytes32' },
        { name: 'resolver', type: 'address' },
        { name: 'data', type: 'bytes[]' },
        { name: 'reverseRecord', type: 'bool' },
        { name: 'ownerControlledFuses', type: 'uint16' }
    ],
    name: 'makeCommitment',
    outputs: [{ name: 'commitment', type: 'bytes32' }],
    payable: false,
    stateMutability: 'pure',
    type: 'function'
}

export const vetDomainCommitABI: abi.Function.Definition = {
    constant: false,
    inputs: [{ name: 'commitment', type: 'bytes32' }],
    name: 'commit',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
}

export const vetDomainRegisterABI: abi.Function.Definition = {
    constant: false,
    inputs: [
        { name: 'name', type: 'string' },
        { name: 'owner', type: 'address' },
        { name: 'duration', type: 'uint256' },
        { name: 'secret', type: 'bytes32' },
        { name: 'resolver', type: 'address' },
        { name: 'data', type: 'bytes[]' },
        { name: 'reverseRecord', type: 'bool' },
        { name: 'ownerControlledFuses', type: 'uint16' }
    ],
    name: 'register',
    outputs: [],
    payable: true,
    stateMutability: 'payable',
    type: 'function'
}

export const vetDomainSetAddrABI: abi.Function.Definition = {
    constant: false,
    inputs: [
        { name: 'node', type: 'bytes32' },
        { name: 'a', type: 'address' }
    ],
    name: 'setAddr',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
}

export function getVetDomainContracts(gid: string): VetDomainContracts | null {
    return VET_DOMAIN_CONTRACTS_BY_GID[gid] || null
}

export function normalizeRegistrationName(input: string): string {
    const name = input.trim().toLowerCase()
    return name.endsWith('.vet') ? name.slice(0, -4) : name
}

export function vetDomainFullName(name: string): string {
    return `${normalizeRegistrationName(name)}.vet`
}

export function vetDomainNamehash(name: string): string {
    const labels = name.split('.').filter(label => label)
    let node = Buffer.alloc(32)

    for (const label of labels.reverse()) {
        node = keccak256(node, keccak256(label))
    }
    return `0x${node.toString('hex')}`
}

export function isBasicRegistrationName(input: string): boolean {
    const name = normalizeRegistrationName(input)
    return /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(name) && !name.includes('.')
}

export function yearsToDuration(years: number): number {
    if (!Number.isInteger(years) || years < 1) {
        throw new Error('invalid duration')
    }
    return years * VET_DOMAIN_REGISTRATION_YEAR_SECONDS
}

export function sumVetDomainPrice(price: VetDomainPrice): string {
    return new BigNumber(price.base || 0).plus(price.premium || 0).toFixed(0)
}

function isRecord(value: unknown): value is Record<string | number, unknown> {
    return typeof value === 'object' && value !== null
}

export function decodedBoolean(decoded: Record<string | number, unknown>): boolean {
    return decoded[0] === true
}

export function decodedString(decoded: Record<string | number, unknown>, key: string): string {
    const value = decoded[key] || decoded[0]
    return typeof value === 'string' ? value : ''
}

export function decodedNumber(decoded: Record<string | number, unknown>): number {
    const value = decoded[0]
    return typeof value === 'string' || typeof value === 'number' ? Number(value) : 0
}

export function decodedVetDomainPrice(decoded: Record<string | number, unknown>): VetDomainPrice {
    const price = isRecord(decoded[0]) ? decoded[0] : decoded
    const base = price.base || price[0]
    const premium = price.premium || price[1]
    return {
        base: typeof base === 'string' || typeof base === 'number' ? base.toString() : '0',
        premium: typeof premium === 'string' || typeof premium === 'number' ? premium.toString() : '0'
    }
}

export function buildVetDomainResolverData(params: VetDomainCommitmentParams): string[] {
    if (!params.setAsPrimary) {
        return []
    }
    const func = new abi.Function(vetDomainSetAddrABI)
    return [func.encode(vetDomainNamehash(vetDomainFullName(params.name)), params.owner)]
}

export function buildVetDomainCommitClause(contracts: VetDomainContracts, commitment: string): Connex.VM.Clause {
    const func = new abi.Function(vetDomainCommitABI)
    return {
        to: contracts.controller,
        value: 0,
        data: func.encode(commitment)
    }
}

export function buildVetDomainRegisterClause(
    contracts: VetDomainContracts,
    params: VetDomainCommitmentParams,
    price: VetDomainPrice
): Connex.VM.Clause {
    const func = new abi.Function(vetDomainRegisterABI)
    const resolverData = buildVetDomainResolverData(params)
    return {
        to: contracts.controller,
        value: sumVetDomainPrice(price),
        data: func.encode(params.name, params.owner, params.duration, params.secret, params.resolver, resolverData, params.setAsPrimary, 0)
    }
}

export function vetDomainCommitmentArgs(params: VetDomainCommitmentParams): unknown[] {
    const resolverData = buildVetDomainResolverData(params)
    return [params.name, params.owner, params.duration, params.secret, params.resolver, resolverData, params.setAsPrimary, 0]
}
