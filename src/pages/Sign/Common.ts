import { defineComponent } from 'vue'
import { SignerGroup } from './models'
import { Transaction, Certificate, blake2b256 } from 'thor-devkit'
import LedgerSignDialog from 'pages/Ledger/SignDialog.vue'
import { isSoftwareWalletType, signHashWithSoftwareWallet } from './software-signer'
import { buildSignerGroups, selectSigner } from './signer-groups'

type SignableTransaction = Transaction<Transaction.LegacyBody | Transaction.DynamicFeeBody>

export default defineComponent({
    props: {
        gid: String,
        req: Object as () => (M.CertRequest | M.TxRequest)
    },
    data() {
        return {
            signer: ''
        }
    },
    computed: {
        wallet(): M.Wallet | null {
            return (this.wallets || []).find(w => w.meta.addresses.includes(this.signer)) || null
        },
        signerGroups(): SignerGroup[] {
            return buildSignerGroups(this.wallets || [], this.req.options.signer, this.req.signers)
        }
    },
    asyncComputed: {
        wallets(): Promise<M.Wallet[] | null> {
            return this.$svc.wallet.getByGid(this.gid)
        }
    },
    watch: {
        // select the first address if not selected
        signerGroups(groups: SignerGroup[]) {
            const selected = selectSigner(groups, this.signer, this.req.preferredSigner)
            if (selected && selected !== this.signer) {
                this.signer = selected
            }
        }
    },
    methods: {
        async signTx(wallet: M.Wallet, signer: string, buildTx: () => Promise<SignableTransaction>): Promise<Buffer> {
            if (isSoftwareWalletType(wallet.meta.type)) {
                // acquire user master key
                const umk = await this.$authenticate()

                const tx = await buildTx()
                return signHashWithSoftwareWallet(wallet, signer, umk, tx.signingHash())
            } else if (wallet.meta.type === 'ledger') {
                const tx = await buildTx()
                return this.$dialog({
                    component: LedgerSignDialog,
                    arg: {
                        signer,
                        index: wallet.meta.addresses.indexOf(signer),
                        tx: tx.encode()
                    }
                })
            } else {
                throw new Error(`unsupported wallet type '${wallet.meta.type}'`)
            }
        },
        async signCert(wallet: M.Wallet, cert: Certificate): Promise<Buffer> {
            if (isSoftwareWalletType(wallet.meta.type)) {
                // acquire user master key
                const umk = await this.$authenticate()

                return signHashWithSoftwareWallet(wallet, cert.signer, umk, blake2b256(Certificate.encode(cert)))
            } else if (wallet.meta.type === 'ledger') {
                return this.$dialog({
                    component: LedgerSignDialog,
                    arg: {
                        signer: cert.signer,
                        index: wallet.meta.addresses.indexOf(cert.signer),
                        cert: Buffer.from(Certificate.encode(cert), 'utf8')
                    }
                })
            } else {
                throw new Error(`unsupported wallet type '${wallet.meta.type}'`)
            }
        }
    },
    beforeMount() {
        const key = `last-signer-${this.gid}`
        this.signer = localStorage.getItem(key) || '' // load last signer
        // save on ok
        this.$once('ok', () => {
            localStorage.setItem(key, this.signer)
        })
    }
})
