<template>
    <q-toolbar>
        <q-btn
            v-show="!$q.screen.xs"
            flat
            dense
            round
            icon="close"
            :aria-label="$t('common.close').toString()"
            :title="$t('common.close').toString()"
            v-close-popup
        />
        <q-toolbar-title class="text-center">
            <slot />
        </q-toolbar-title>
        <!-- a placeholder to make title centered -->
        <q-btn
            v-show="!$q.screen.xs"
            class="invisible"
            flat
            dense
            round
            aria-hidden="true"
            tabindex="-1"
        />
    </q-toolbar>
</template>
