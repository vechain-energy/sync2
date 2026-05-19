import { abi } from 'thor-devkit'
import { BigNumber } from 'bignumber.js'
import { genesises } from '../consts'

export const VET_DOMAIN_REGISTRATION_YEAR_SECONDS = 31536000

export type VetDomainContracts = {
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
}

export const VET_DOMAIN_CONTRACTS_BY_GID: Record<string, VetDomainContracts> = {
    [genesises.main.id]: {
        controller: '0x07479F2710d16a0bACbE6C25b9b32447364C0A33',
        resolver: '0xabac49445584C8b6c1472b030B1076Ac3901D7cf'
    },
    [genesises.test.id]: {
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

export function getVetDomainContracts(gid: string): VetDomainContracts | null {
    return VET_DOMAIN_CONTRACTS_BY_GID[gid] || null
}

export function normalizeRegistrationName(input: string): string {
    const name = input.trim().toLowerCase()
    return name.endsWith('.vet') ? name.slice(0, -4) : name
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
    return {
        to: contracts.controller,
        value: sumVetDomainPrice(price),
        data: func.encode(params.name, params.owner, params.duration, params.secret, params.resolver, [], false, 0)
    }
}

export function vetDomainCommitmentArgs(params: VetDomainCommitmentParams): unknown[] {
    return [params.name, params.owner, params.duration, params.secret, params.resolver, [], false, 0]
}
