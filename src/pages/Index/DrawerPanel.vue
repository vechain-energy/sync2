<template>
    <div
        class="fit column no-wrap drawer-panel"
    >
        <!-- drawer content header -->
        <q-toolbar>
            <q-avatar square>
                <img
                    src="~assets/sync-logo.svg"
                    alt="Sync2"
                >
            </q-avatar>
            <q-toolbar-title>
                Sync2
                <q-badge
                    v-if="distTag"
                    outline
                    color="warning"
                    align="top"
                    class="text-capitalize"
                >{{distTag}} </q-badge>
            </q-toolbar-title>
        </q-toolbar>
        <!-- content slot -->
        <div class="col">
            <slot />
        </div>
        <!-- drawer content footer -->
        <q-list padding>
            <q-item :to="{name: 'swap'}">
                <q-item-section avatar>
                    <q-icon
                        size="sm"
                        name="swap_horiz"
                    />
                </q-item-section>
                <q-item-section>
                    <q-item-label>{{$t('index.action_swap')}}</q-item-label>
                </q-item-section>
            </q-item>
            <q-item :to="{name: 'domains'}">
                <q-item-section avatar>
                    <q-icon
                        size="sm"
                        name="language"
                    />
                </q-item-section>
                <q-item-section>
                    <q-item-label>{{$t('index.action_domains')}}</q-item-label>
                </q-item-section>
            </q-item>
            <q-item :to="{name: 'settings'}">
                <q-item-section avatar>
                    <q-icon
                        size="sm"
                        name="settings"
                    />
                </q-item-section>
                <q-item-section>
                    <q-item-label>{{$t('index.action_settings')}}</q-item-label>
                </q-item-section>
            </q-item>
            <q-item :to="{name: 'activities'}">
                <q-item-section avatar>
                    <q-icon
                        size="sm"
                        name="history"
                    />
                </q-item-section>
                <q-item-section>
                    <q-item-label>{{$t('index.action_activities')}}</q-item-label>
                </q-item-section>
                <q-item-section
                    v-if="ongoingActivitiesCount>0"
                    side
                >
                    <q-badge
                        color="red"
                        class="q-mr-md"
                    >{{ongoingActivitiesCount}}</q-badge>
                </q-item-section>
            </q-item>
            <q-item
                dense
                v-if="version && build"
            >
                <q-item-section class="text-center">
                    <q-item-label
                        caption
                        class="ellipsis"
                    >v{{version}} ({{build}})<br><span class="text-capitalize">{{mode}}</span></q-item-label>
                </q-item-section>
            </q-item>
        </q-list>
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { countPendingTxActivities } from 'pages/Activities/pending'

export default defineComponent({
    computed: {
        distTag(): string { return process.env.DIST_TAG || '' },
        version(): string { return process.env.APP_VERSION || '' },
        build(): string { return process.env.APP_BUILD || '' },
        mode(): string {
            switch (process.env.MODE) {
                case 'spa':
                case 'pwa':
                    return 'lite'
                default: return process.env.MODE || ''
            }
        }
    },
    asyncComputed: {
        ongoingActivitiesCount() {
            return this.$svc.activity.uncompleted().then(activities => {
                return countPendingTxActivities(activities, activity => {
                    return this.$svc.bc(activity.gid).thor.status.head.number
                })
            })
        }
    }
})
</script>
<style scoped>
.drawer-panel {
    width: 300px !important;
    max-width: 80vw;
}
</style>
