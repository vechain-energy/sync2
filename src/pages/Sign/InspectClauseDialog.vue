<template>
    <q-dialog
        ref="dialog"
        @hide="$emit('hide')"
        position="bottom"
    >
        <q-card class="full-width">
            <q-toolbar>
                <q-toolbar-title class="text-center">Clause · {{clauseNumber}}</q-toolbar-title>
            </q-toolbar>
            <q-list padding>
                <template v-if="clause.comment">
                    <q-item>
                        <q-item-section>
                            <q-item-label caption>Comment</q-item-label>
                            <q-item-label>{{clause.comment}}</q-item-label>
                        </q-item-section>
                    </q-item>
                    <q-separator inset />
                </template>
                <q-item>
                    <q-item-section>
                        <q-item-label caption>To</q-item-label>
                        <q-item-label class="break-all">
                            <address-label
                                :addr="clause.to"
                                :gid="gid"
                                full
                            >null</address-label>
                        </q-item-label>
                    </q-item-section>
                </q-item>
                <q-item>
                    <q-item-section>
                        <q-item-label caption>Value (wei)</q-item-label>
                        <q-item-label>
                            <amount-label
                                :value="clause.value"
                                :fixed="0"
                            />
                        </q-item-label>
                    </q-item-section>
                </q-item>
                <q-item>
                    <q-item-section>
                        <q-tabs breakpoint="350" class="text-grey" active-color="primary" align="left" dense v-model="dataPanel" no-caps>
                            <q-tab default name="data" label="Data" />
                            <q-tab name="decoded" label="Decoded" />
                            <q-tab name="utf-8" label="UTF-8" />
                        </q-tabs>
                        <q-tab-panels animated v-model="dataPanel">
                            <q-tab-panel name="data">
                                <q-input
                                    square
                                    v-if="clause.data && clause.data.length > 2"
                                    aria-label="Clause data"
                                    dense
                                    class="monospace"
                                    input-class="clause-data-textarea"
                                    type="textarea"
                                    standout
                                    readonly
                                    :model-value="clause.data"
                                />
                                <template v-else>N/A</template>
                            </q-tab-panel>
                            <q-tab-panel name="decoded">
                                <div v-if="decodedObject"
                                    class="monospace q-pa-sm tab-content" >
                                    <template v-if="decodedObject.kind === 'smart-wallet-instruction'">
                                        <strong>Smart wallet instruction · {{decodedObject.wrapperName}}</strong>
                                        <div class="q-pt-xs">
                                            <span class="text-grey-7">target: </span>
                                            <span>{{decodedObject.target}}</span>
                                        </div>
                                        <div class="q-pt-xs">
                                            <span class="text-grey-7">value: </span>
                                            <span>{{decodedObject.value}}</span>
                                        </div>
                                        <div class="q-pt-xs" v-if="decodedObject.operation !== undefined">
                                            <span class="text-grey-7">operation: </span>
                                            <span>{{decodedObject.operation}}</span>
                                        </div>
                                        <div class="q-pt-xs" v-for="p in decodedObject.metaParams" :key="paramKey(p)">
                                            <span class="text-grey-7">{{p.name}}: </span>
                                            <span>{{p.value}}</span>
                                        </div>
                                        <div class="q-pt-md">
                                            <strong>function {{formatFunction(decodedObject.call)}}</strong>
                                        </div>
                                        <div class="q-pt-xs" v-for="p in decodedObject.call.params" :key="paramKey(p)">
                                            <span class="text-grey-7">{{p.name}}: </span>
                                            <span>{{p.value}}</span>
                                        </div>
                                    </template>
                                    <template v-else-if="decodedObject.kind === 'smart-wallet-batch'">
                                        <strong>Smart wallet batch · {{decodedObject.wrapperName}}</strong>
                                        <div class="q-pt-xs" v-for="p in decodedObject.metaParams" :key="paramKey(p)">
                                            <span class="text-grey-7">{{p.name}}: </span>
                                            <span>{{p.value}}</span>
                                        </div>
                                        <div class="q-pt-md" v-for="(instruction, instructionIndex) in decodedObject.instructions" :key="instructionKey(instruction, instructionIndex)">
                                            <strong>Instruction {{instructionIndex + 1}}</strong>
                                            <div class="q-pt-xs">
                                                <span class="text-grey-7">target: </span>
                                                <span>{{instruction.target}}</span>
                                            </div>
                                            <div class="q-pt-xs">
                                                <span class="text-grey-7">value: </span>
                                                <span>{{instruction.value}}</span>
                                            </div>
                                            <div class="q-pt-xs">
                                                <strong>function {{formatFunction(instruction.call)}}</strong>
                                            </div>
                                            <div class="q-pt-xs" v-for="p in instruction.call.params" :key="paramKey(p)">
                                                <span class="text-grey-7">{{p.name}}: </span>
                                                <span>{{p.value}}</span>
                                            </div>
                                        </div>
                                    </template>
                                    <template v-else>
                                        <strong>function {{formatFunction(decodedObject)}}</strong>
                                        <div class="q-pt-xs" v-for="p in decodedObject.params" :key="paramKey(p)">
                                            <span class="text-grey-7">{{p.name}}: </span>
                                            <span>{{p.value}}</span>
                                        </div>
                                    </template>
                                </div>
                                <template v-else>Unable to decode data</template>
                            </q-tab-panel>
                            <q-tab-panel name="utf-8">
                                <div class="monospace q-pa-sm tab-content"
                                    v-if="decodedString">{{decodedString}}</div>
                                <template v-else>N/A</template>
                            </q-tab-panel>
                        </q-tab-panels>
                    </q-item-section>
                </q-item>
            </q-list>
        </q-card>
    </q-dialog>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { QDialog } from 'quasar'
import AddressLabel from 'src/components/AddressLabel.vue'
import AmountLabel from 'src/components/AmountLabel.vue'
import { decodeClauseData, DecodedCall, DecodedClauseData, DecodedParam, DecodedSmartWalletInstruction } from './clause-decoder'

export default defineComponent({
    emits: ['hide'],
    components: { AddressLabel, AmountLabel },
    props: {
        index: {
            type: Number,
            default: 0
        },
        gid: String,
        clause: {
            type: Object as () => Connex.Vendor.TxMessage[0],
            required: true
        }
    },
    data() {
        return {
            dataPanel: 'data' as 'data' | 'decoded' | 'utf-8'
        }
    },
    methods: {
        // method is REQUIRED by $q.dialog
        show() { (this.$refs.dialog as QDialog).show() },
        // method is REQUIRED by $q.dialog
        hide() { (this.$refs.dialog as QDialog).hide() },
        formatFunction(decodedCall: DecodedCall): string {
            return `${decodedCall.name}(${decodedCall.params.map(i => i.name + ': ' + i.type).join(', ')})`
        },
        paramKey(param: DecodedParam): string {
            return `${param.name}:${param.type}:${String(param.value)}`
        },
        instructionKey(instruction: DecodedSmartWalletInstruction, index: number): string {
            return `${index}:${instruction.target}:${String(instruction.value)}:${instruction.call.name}`
        }
    },
    asyncComputed: {
        async decodedObject(): Promise<DecodedClauseData|null> {
            return decodeClauseData(this.clause)
        }
    },
    computed: {
        clauseNumber(): number {
            return Number.isFinite(this.index) ? this.index + 1 : 1
        },
        decodedString() {
            if (!this.clause.data || this.clause.data.length <= 2) {
                return null
            }

            return Buffer.from(this.clause.data.slice(2), 'hex').toString('utf-8')
        }
    }
})
</script>
<style>
.tab-content {
    width: 100%;
    white-space: break-spaces;
    word-break: break-all;
    font-size: 14px;
    height: 150px;
    overflow: auto;
    background-color: #0000000d;
    border: 1px dashed #b8b8b8;
}

.break-all {
    word-break: break-all;
}

.clause-data-textarea {
    height: 146px;
}
</style>
