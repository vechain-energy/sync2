<template>
    <div>
        <q-slide-transition>
            <div v-show="!dismissed">
                <div class="q-pa-xs">
                    <q-banner
                        dark
                        dense
                        rounded
                        class="bg-warning"
                    >
                        {{$t('index.msg_backup')}}
                        <template v-slot:action>
                            <q-btn
                                flat
                                :label="$t('common.dismiss')"
                                @click="dismissed=true"
                            />
                            <q-btn
                                flat
                                :label="$t('index.action_backup_now')"
                                @click="$emit('backup')"
                            />
                        </template>
                    </q-banner>
                </div>
            </div>
        </q-slide-transition>
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
    emits: ['backup'],
    data: () => {
        return {
            dismissed: false
        }
    }
})
</script>
