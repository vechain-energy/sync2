<template>
    <q-popup-proxy
        v-bind="$attrs"
        v-on="$listeners"
        position="bottom"
        v-model="opened"
    >
        <q-card>
            <q-list
                padding
                :separator="separator"
            >
                <template
                    v-for="(sheet,i) in sheets"
                    :key="i"
                >
                    <q-separator
                        v-if="sheet.separator"
                        v-show="!sheet.hidden"
                    />
                    <q-item
                        v-show="!sheet.hidden"
                        :clickable="!!sheet.action"
                        :dense="sheet.header && !sheet.action"
                        @click="opened=false; sheet.action && sheet.action()"
                    >
                        <q-item-section>
                            <q-item-label
                                :lines="1"
                                class="q-px-lg text-center"
                                :class="sheet.classes"
                                :header="sheet.header"
                            >
                                {{sheet.label}}
                            </q-item-label>
                        </q-item-section>
                    </q-item>
                </template>
            </q-list>
        </q-card>
    </q-popup-proxy>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export type Sheet<T = never> = {
    label: string
    action?: () => void
    classes?: string | string[]
    model?: T
    separator?: boolean
    header?: boolean
    hidden?: boolean
}

export default defineComponent({
    props: {
        sheets: Array as () => Sheet[],
        separator: Boolean
    },
    data() {
        return { opened: false }
    }
})
</script>
