import { abi } from 'thor-devkit'
import { genesises } from '../consts'
import { VetDomainContracts, vetDomainNamehash } from './vet-domain-registration'

export const VET_DOMAIN_PROFILE_TEXT_KEYS = [
    'avatar',
    'display',
    'description',
    'email',
    'url',
    'com.x'
] as const

export type VetDomainProfileKey = typeof VET_DOMAIN_PROFILE_TEXT_KEYS[number]

export type VetDomainProfile = Record<VetDomainProfileKey, string>

export type VetDomainProfileChange = {
    key: VetDomainProfileKey
    value: string
}

export type VetDomainPreparedAvatar = {
    blob: Blob
    filename: string
}

type VetDomainIpfsConfig = {
    fetchingService: string
    pinningService: string
}

type IpfsPinningResponse = {
    IpfsHash?: string
}

const VET_DOMAIN_IPFS_BY_GID: Record<string, VetDomainIpfsConfig> = {
    [genesises.main.id]: {
        fetchingService: 'https://api.gateway-proxy.vechain.org/ipfs',
        pinningService: 'https://api.gateway-proxy.vechain.org/api/v1/pinning/pinFileToIPFS'
    },
    [genesises.test.id]: {
        fetchingService: 'https://api.dev.gateway-proxy.vechain.org/ipfs',
        pinningService: 'https://api.dev.gateway-proxy.vechain.org/api/v1/pinning/pinFileToIPFS'
    }
}

export const VET_DOMAIN_PROFILE_AVATAR_MAX_BYTES = 400 * 1024
export const VET_DOMAIN_PROFILE_AVATAR_MAX_DIMENSION = 1920

export const vetDomainResolverABI: abi.Function.Definition = {
    constant: true,
    inputs: [{ name: 'node', type: 'bytes32' }],
    name: 'resolver',
    outputs: [{ name: 'resolverAddress', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
}

export const vetDomainTextABI: abi.Function.Definition = {
    constant: true,
    inputs: [
        { name: 'node', type: 'bytes32' },
        { name: 'key', type: 'string' }
    ],
    name: 'text',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
}

export const vetDomainSetTextABI: abi.Function.Definition = {
    constant: false,
    inputs: [
        { name: 'node', type: 'bytes32' },
        { name: 'key', type: 'string' },
        { name: 'value', type: 'string' }
    ],
    name: 'setText',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function'
}

export function emptyVetDomainProfile(): VetDomainProfile {
    return {
        avatar: '',
        display: '',
        description: '',
        email: '',
        url: '',
        'com.x': ''
    }
}

export function supportsVetDomainProfile(gid: string): boolean {
    return !!VET_DOMAIN_IPFS_BY_GID[gid]
}

export function normalizeVetDomainProfile(profile: Partial<VetDomainProfile>): VetDomainProfile {
    const normalized = emptyVetDomainProfile()
    for (const key of VET_DOMAIN_PROFILE_TEXT_KEYS) {
        const value = profile[key]
        normalized[key] = typeof value === 'string' ? value.trim() : ''
    }
    normalized['com.x'] = normalized['com.x'].replace(/^@+/, '')
    return normalized
}

export function changedVetDomainProfileRecords(
    previous: Partial<VetDomainProfile>,
    next: Partial<VetDomainProfile>
): VetDomainProfileChange[] {
    const prev = normalizeVetDomainProfile(previous)
    const normalizedNext = normalizeVetDomainProfile(next)
    return VET_DOMAIN_PROFILE_TEXT_KEYS
        .filter(key => prev[key] !== normalizedNext[key])
        .map(key => ({
            key,
            value: normalizedNext[key]
        }))
}

export function buildVetDomainProfileUpdateClauses(
    resolverAddress: string,
    name: string,
    changes: VetDomainProfileChange[]
): Connex.VM.Clause[] {
    const func = new abi.Function(vetDomainSetTextABI)
    const node = vetDomainNamehash(name)
    return changes.map(change => ({
        to: resolverAddress,
        value: 0,
        data: func.encode(node, change.key, change.value)
    }))
}

export function convertVetDomainProfileUriToUrl(uri: string, gid: string): string {
    const value = uri.trim()
    if (!value) {
        return ''
    }
    if (value.startsWith('data:')) {
        return value
    }

    const splitIndex = value.indexOf('://')
    if (splitIndex < 0) {
        return ''
    }

    const protocol = value.slice(0, splitIndex)
    const rest = value.slice(splitIndex + 3)
    if (protocol === 'ipfs') {
        if (!/^ipfs:\/\/[a-zA-Z0-9]+(\/[^/]+)*\/?$/.test(value)) {
            return ''
        }
        const config = VET_DOMAIN_IPFS_BY_GID[gid]
        return config ? `${config.fetchingService}/${rest}` : ''
    }
    if (protocol === 'ar') {
        return `https://arweave.net/${rest}`
    }
    if (protocol === 'http' || protocol === 'https') {
        return value
    }
    return ''
}

export function vetDomainProfileTransactionComment(name: string): string {
    return `Update VNS profile ${name}`
}

export function isHttpUrl(value: string): boolean {
    try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
        return false
    }
}

function avatarFilename(filename: string): string {
    const name = filename.trim().replace(/\.[^.]+$/, '') || 'avatar'
    return `${name}.jpg`
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const image = new Image()
        image.onload = () => {
            URL.revokeObjectURL(url)
            resolve(image)
        }
        image.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('selected file is not a valid image'))
        }
        image.src = url
    })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            blob ? resolve(blob) : reject(new Error('image compression failed'))
        }, 'image/jpeg', quality)
    })
}

export async function prepareVetDomainProfileAvatar(file: File): Promise<VetDomainPreparedAvatar> {
    const image = await loadImage(file)
    const scale = Math.min(
        1,
        VET_DOMAIN_PROFILE_AVATAR_MAX_DIMENSION / Math.max(image.width, image.height)
    )
    if (scale === 1 && file.size <= VET_DOMAIN_PROFILE_AVATAR_MAX_BYTES) {
        return { blob: file, filename: file.name || 'avatar.png' }
    }

    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
        throw new Error('image compression failed')
    }
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    let quality = 0.9
    let blob = await canvasToBlob(canvas, quality)
    while (blob.size > VET_DOMAIN_PROFILE_AVATAR_MAX_BYTES && quality > 0.55) {
        quality -= 0.1
        blob = await canvasToBlob(canvas, quality)
    }

    return {
        blob,
        filename: avatarFilename(file.name)
    }
}

function parseIpfsPinningResponse(text: string): string {
    const data = JSON.parse(text) as IpfsPinningResponse
    if (!data.IpfsHash) {
        throw new Error('IPFS upload did not return a hash')
    }
    return `ipfs://${data.IpfsHash}`
}

function safeMultipartFilename(filename: string): string {
    return (filename || 'avatar')
        .replace(/[\r\n"]/g, '_')
}

function isElectronMode(): boolean {
    return typeof process !== 'undefined' && process.env.MODE === 'electron'
}

async function blobToBuffer(blob: Blob): Promise<Buffer> {
    return Buffer.from(await blob.arrayBuffer())
}

async function uploadVetDomainProfileAvatarWithNode(blob: Blob, filename: string, config: VetDomainIpfsConfig): Promise<string> {
    const https = require('https') as typeof import('https')
    const file = await blobToBuffer(blob)
    const boundary = `----sync2-vns-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
    const head = Buffer.from([
        `--${boundary}`,
        `Content-Disposition: form-data; name="file"; filename="${safeMultipartFilename(filename)}"`,
        `Content-Type: ${blob.type || 'application/octet-stream'}`,
        '',
        ''
    ].join('\r\n'))
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`)
    const body = Buffer.concat([head, file, tail])
    const url = new URL(config.pinningService)

    return new Promise((resolve, reject) => {
        const req = https.request({
            method: 'POST',
            protocol: url.protocol,
            hostname: url.hostname,
            path: `${url.pathname}${url.search}`,
            headers: {
                'X-Project-Id': 'vechain-kit',
                Accept: '*/*',
                'User-Agent': 'curl/8.7.1',
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length
            }
        }, res => {
            const chunks: Buffer[] = []
            res.on('data', chunk => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            })
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf8')
                const status = res.statusCode || 0
                if (status < 200 || status >= 300) {
                    reject(new Error(`IPFS upload failed with status ${status}`))
                    return
                }
                try {
                    resolve(parseIpfsPinningResponse(text))
                } catch (err) {
                    reject(err)
                }
            })
        })
        req.on('error', reject)
        req.end(body)
    })
}

export async function uploadVetDomainProfileAvatar(blob: Blob, filename: string, gid: string): Promise<string> {
    const config = VET_DOMAIN_IPFS_BY_GID[gid]
    if (!config) {
        throw new Error('VNS profile is not supported on this network')
    }

    if (isElectronMode()) {
        return uploadVetDomainProfileAvatarWithNode(blob, filename, config)
    }

    const form = new FormData()
    form.append('file', blob, filename)

    const response = await fetch(config.pinningService, {
        method: 'POST',
        headers: {
            'X-Project-Id': 'vechain-kit'
        },
        body: form
    })
    if (!response.ok) {
        throw new Error(`IPFS upload failed with status ${response.status}`)
    }

    return parseIpfsPinningResponse(await response.text())
}

export function getVetDomainRegistry(contracts: VetDomainContracts): string {
    return contracts.registry
}
