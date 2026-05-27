import { abi } from 'thor-devkit'
import { abis } from 'src/consts'
import { TransferLogItem } from './models'

function normalizedAddress(value: unknown): string {
    return typeof value === 'string' ? value.toLowerCase() : ''
}

function createEventCriteria(thor: Connex.Thor, tokens: string[], address: string): Connex.Thor.Filter.Criteria<'event'>[] {
    const from = tokens.map(item => {
        return thor.account(item).event(abis.transferEvent).asCriteria({
            _from: address
        })
    })
    const to = tokens.map(item => {
        return thor.account(item).event(abis.transferEvent).asCriteria({
            _to: address
        })
    })
    return [...from, ...to]
}

export async function vetTransfers(thor: Connex.Thor, token: M.TokenSpec, address: string, fromBlock: number, toBlock: number, offset: number, size: number): Promise<TransferLogItem[]> {
    const transferCriteria = [{ sender: address }, { recipient: address }]
    const normalized = normalizedAddress(address)
    const filter = thor.filter('transfer', transferCriteria)
    const transfers = await filter.order('desc').range({
        unit: 'block',
        from: fromBlock,
        to: toBlock
    }).cache([address])
        .apply(offset, size)

    const result: TransferLogItem[] = []
    transfers.forEach(item => {
        const temp: M.TransferLog = {
            token: token,
            meta: item.meta,
            amount: item.amount,
            sender: item.sender,
            recipient: item.recipient
        }

        if (normalizedAddress(item.sender) === normalized) {
            result.push({ ...temp, direction: '-' })
        }
        if (normalizedAddress(item.recipient) === normalized) {
            result.push({ ...temp, direction: '+' })
        }
    })

    return result
}
export async function tokenTransfers(thor: Connex.Thor, tokenList: M.TokenSpec[], address: string, fromBlock: number, toBlock: number, offset: number, size: number): Promise<TransferLogItem[]> {
    const tokenMap: { [k: string]: M.TokenSpec } = {}
    tokenList.forEach(item => {
        tokenMap[normalizedAddress(item.address)] = item
    })
    const normalized = normalizedAddress(address)
    const tokenCriteria = createEventCriteria(thor, tokenList.map(item => item.address), address)
    const filter = thor.filter('event', tokenCriteria)

    const event = await filter.order('desc').range({
        unit: 'block',
        from: fromBlock,
        to: toBlock
    }).cache([address])
        .apply(offset, size)

    const ev = new abi.Event(abis.transferEvent)
    const result: TransferLogItem[] = []

    event.forEach(item => {
        const decode = ev.decode(item.data, item.topics)
        const token = tokenMap[normalizedAddress(item.address)]
        if (!token) {
            return
        }
        const temp: M.TransferLog = {
            token,
            meta: item.meta,
            sender: decode._from,
            amount: decode._value,
            recipient: decode._to
        }

        if (normalizedAddress(decode._from) === normalized) {
            result.push({ ...temp, direction: '-' })
        }
        if (normalizedAddress(decode._to) === normalized) {
            result.push({ ...temp, direction: '+' })
        }
    })

    return result
}
