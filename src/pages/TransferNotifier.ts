import Vue from 'vue'
import { abis } from 'src/consts'
import { BigNumber } from 'bignumber.js'
import { abi, address } from 'thor-devkit'

export default Vue.extend({
    props: {
        gid: String
    },
    computed: {
        thor(): Connex.Thor { return this.$svc.bc(this.gid).thor },
        addresses(): string[] {
            if (!this.wallets) {
                return []
            }
            return Array.from(this.wallets.reduce<Set<string>>((prev, cur) => {
                cur.meta.addresses.forEach(a => prev.add(a))
                return prev
            }, new Set()))
        },
        // compose vet transfer criteria
        transferCriteria(): Connex.Thor.Filter.Criteria<'transfer'>[] {
            return this.addresses.reduce<Connex.Thor.Filter.Criteria<'transfer'>[]>((prev, cur) => {
                prev.push({ sender: cur }, { recipient: cur })
                return prev
            }, [])
        },
        // compose token transfer criteria
        eventCriteria(): Connex.Thor.Filter.Criteria<'event'>[] {
            const tokens = this.tokens
            if (!tokens) {
                return []
            }
            return this.addresses.reduce<Connex.Thor.Filter.Criteria<'event'>[]>((prev, cur) => {
                tokens.forEach(spec => {
                    const ev = this.thor
                        .account(spec.address)
                        .event(abis.transferEvent)
                    prev.push(
                        ev.asCriteria({ _from: cur }),
                        ev.asCriteria({ _to: cur }))
                })
                return prev
            }, [])
        }
    },
    asyncComputed: {
        wallets(): Promise<M.Wallet[] | null> {
            return this.$svc.wallet.getByGid(this.gid)
        },
        async tokens(): Promise<M.TokenSpec[] | null> {
            const [tokens, activeSymbols] = await Promise.all([
                this.$svc.config.token.all(),
                this.$svc.config.token.activeSymbols()
            ])
            return tokens.filter(token =>
                token.address && // exclude vet
                token.gid === this.gid &&
                (activeSymbols.includes(token.symbol) || token.permanent))
        },
        // vet transfers
        transfers: {
            get(): Promise<Connex.Thor.Filter.Row<'transfer'>[] | null> {
                return this.guardRange('transfer', range => {
                    const criteria = this.transferCriteria
                    if (criteria.length === 0) {
                        return Promise.resolve([])
                    }

                    return this.thor.filter('transfer', criteria)
                        .cache(this.addresses)
                        .range(range)
                        .apply(0, 5)
                })
            },
            // no auto update, but react to headNumber change
            shouldUpdate() { return false }
        },
        // token transfers
        events: {
            get(): Promise<Connex.Thor.Filter.Row<'event'>[] | null> {
                return this.guardRange('event', range => {
                    const criteria = this.eventCriteria
                    if (criteria.length === 0) {
                        return Promise.resolve([])
                    }

                    return this.thor.filter('event', criteria)
                        .cache(this.addresses)
                        .range(range)
                        .apply(0, 5)
                })
            },
            // no auto update, but react to headNumber change
            shouldUpdate() { return false }
        }
    },
    watch: {
        thor() {
            this.$asyncComputed.events.update()
            this.$asyncComputed.transfers.update()
        },
        transfers(newVal: Connex.Thor.Filter.Row<'transfer'>[] | null) {
            const wallets = this.wallets
            if (!wallets) {
                return
            }
            newVal && newVal.forEach(t => {
                let w = wallets.find(w => w.meta.addresses.includes(t.recipient))
                if (w) {
                    this.notify('in', t.sender, t.amount, 18, 'VET', w.id, w.meta.addresses.indexOf(t.recipient))
                }
                w = wallets.find(w => w.meta.addresses.includes(t.sender))
                if (w) {
                    this.notify('out', t.recipient, t.amount, 18, 'VET', w.id, w.meta.addresses.indexOf(t.sender))
                }
            })
        },
        events(newVal: Connex.Thor.Filter.Row<'event'>[] | null) {
            const wallets = this.wallets
            const tokens = this.tokens
            if (!wallets || !tokens) {
                return
            }
            newVal && newVal.forEach(e => {
                const token = tokens.find(t => t.address === e.address)
                if (!token) {
                    return
                }
                const { _to, _from, _value } = new abi.Event(abis.transferEvent).decode(e.data, e.topics)
                let w = wallets.find(w => w.meta.addresses.includes(_to))
                if (w) {
                    this.notify('in', _from, _value, token.decimals, token.symbol, w.id, w.meta.addresses.indexOf(_to))
                }
                w = wallets.find(w => w.meta.addresses.includes(_from))
                if (w) {
                    this.notify('out', _to, _value, 18, 'VET', w.id, w.meta.addresses.indexOf(_from))
                }
            })
        }
    },
    methods: {
        // provides stored range for the query
        async guardRange<T extends Connex.Thor.Filter.WithMeta>(kind: string, query: (range: Connex.Thor.Filter.Range) => Promise<T[]>): Promise<T[]> {
            const key = `notifier-query-range-start_${kind}`

            const headNum = this.thor.status.head.number
            const savedRange = localStorage.getItem(key)
            const rangeStart = parseInt(savedRange!) || headNum
            if (rangeStart === 0) {
                return []
            }

            const result = await query({ unit: 'block', from: rangeStart, to: 2 ** 32 - 1 })
            if (result.length > 0) {
                localStorage.setItem(key, (result[result.length - 1].meta.blockNumber + 1).toString())
            } else if (!savedRange || headNum > rangeStart + 100) {
                localStorage.setItem(key, headNum.toString())
            }
            return result
        },
        notify(dir: 'in' | 'out', whom: string, amount: string, decimal: number, symbol: string, walletId: number, addressIndex: number) {
            whom = this.formatAddress(whom)
            amount = this.formatAmount(amount, decimal)
            const message = dir === 'in'
                ? `Received <strong>${amount}</strong> ${symbol} from ${whom}`
                : `Sent <strong>${amount}</strong> ${symbol} to ${whom}`

            this.$q.notify({
                type: 'info',
                message,
                position: 'top-right',
                html: true,
                timeout: 0,
                actions: [{
                    label: 'View',
                    color: 'white',
                    handler: () => this.$router.push({
                        name: 'asset',
                        params: {
                            walletId: walletId.toString(),
                            addressIndex: addressIndex.toString(),
                            symbol
                        }
                    })
                }, {
                    label: 'Dismiss',
                    color: 'white'
                }]

            })
        },
        formatAmount(amount: string, decimal: number) {
            return new BigNumber(amount)
                .div(new BigNumber('1' + '0'.repeat(decimal)))
                .toFormat(2)
        },
        formatAddress(addr: string) {
            const c = address.toChecksumed(addr)
            return c.slice(0, 6) + '⋯' + c.slice(-6)
        }
    },
    render(h) {
        return h()
    }
})
