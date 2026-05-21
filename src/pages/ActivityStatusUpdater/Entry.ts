import { defineComponent } from 'vue'
import { decideTxActivityStatus, parseStoredTx } from './status'

export default defineComponent({
    props: {
        activity: Object as () => M.Activity
    },
    data() {
        return {
            updating: false,
            updateAgain: false
        }
    },
    computed: {
        thor(): Connex.Thor { return this.$svc.bc(this.activity.gid).thor },
        headNumber(): number { return this.thor.status.head.number }
    },
    watch: {
        headNumber() {
            void this.updateStatus()
        },
        activity() {
            void this.updateStatus()
        }
    },
    mounted() {
        void this.updateStatus()
    },
    methods: {
        async updateStatus(): Promise<void> {
            if (this.updating) {
                this.updateAgain = true
                return
            }

            this.updating = true
            try {
                do {
                    this.updateAgain = false
                    try {
                        await this.updateStatusOnce()
                    } catch (err) {
                        console.warn('activity status update:', err)
                    }
                } while (this.updateAgain)
            } finally {
                this.updating = false
            }
        },
        async updateStatusOnce(): Promise<void> {
            const activity = this.activity
            if (activity.type !== 'tx') {
                return
            }

            const storedTx = parseStoredTx(activity.glob.encoded)
            const receipt = storedTx
                ? await this.thor.transaction(storedTx.id).getReceipt()
                : null
            const decision = decideTxActivityStatus({
                glob: activity.glob,
                headNumber: this.headNumber,
                receipt,
                storedTx
            })

            if (decision.shouldCommit) {
                this.$svc.bc(activity.gid).commitTx(activity.glob.encoded)
            }
            if (Object.keys(decision.values).length > 0) {
                await this.$svc.activity.update(activity.id, decision.values)
            }
        }
    },
    render(): null {
        return null
    }
})
