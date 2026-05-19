import { abi } from 'thor-devkit'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export const approveABI: abi.Function.Definition = {
    constant: false,
    inputs: [
        { name: '_spender', type: 'address' },
        { name: '_value', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
}

export const getAmountsOutABI: abi.Function.Definition = {
    constant: true,
    inputs: [
        { name: 'amountIn', type: 'uint256' },
        { name: 'path', type: 'address[]' }
    ],
    name: 'getAmountsOut',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
}

export const swapExactETHForTokensABI: abi.Function.Definition = {
    constant: false,
    inputs: [
        { name: 'amountOutMin', type: 'uint256' },
        { name: 'path', type: 'address[]' },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'uint256' }
    ],
    name: 'swapExactETHForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    payable: true,
    stateMutability: 'payable',
    type: 'function'
}

export const swapExactTokensForETHABI: abi.Function.Definition = {
    constant: false,
    inputs: [
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOutMin', type: 'uint256' },
        { name: 'path', type: 'address[]' },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'uint256' }
    ],
    name: 'swapExactTokensForETH',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
}

export const swapExactTokensForTokensABI: abi.Function.Definition = {
    constant: false,
    inputs: [
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOutMin', type: 'uint256' },
        { name: 'path', type: 'address[]' },
        { name: 'to', type: 'address' },
        { name: 'deadline', type: 'uint256' }
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
}

export const transferEventABI: abi.Event.Definition = {
    anonymous: false,
    inputs: [
        { indexed: true, name: '_from', type: 'address' },
        { indexed: true, name: '_to', type: 'address' },
        { indexed: false, name: '_value', type: 'uint256' }
    ],
    name: 'Transfer',
    type: 'event'
}
