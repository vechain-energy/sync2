<template>
    <div>
        <slot :displayName="displayName(configLang)" />
        <pop-sheets
            v-bind="$attrs"
            :sheets="sheets"
        />
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import PopSheets, { Sheet } from 'src/components/PopSheets.vue'

// maps lang to lang's localized display name
const displayNames: Record<string, string> = {
    'en-us': 'English (U.S.)',
    'zh-cn': '中文 (中国)'
}
type DisplayNamesConstructor = new (
    locales: string[],
    options: { type: 'language' }
) => {
    of(code: string): string | undefined
}
type IntlWithDisplayNames = typeof Intl & {
    DisplayNames?: DisplayNamesConstructor
}

export default defineComponent({
    components: { PopSheets },
    computed: {
        sheets(): Sheet[] {
            // empty lang means auto
            return ['', ...this.$i18n.availableLocales]
                .map<Sheet>(lang => {
                    return {
                        label: this.displayName(lang) + (this.configLang === lang ? ' ✓' : ''),
                        action: () => { this.$svc.config.saveLanguage(lang) }
                    }
                })
        }
    },
    asyncComputed: {
        configLang() {
            return this.$svc.config.getLanguage()
        }
    },
    methods: {
        displayName(lang: string): string {
            if (!lang) {
                return this.$t('common.lang_auto').toString()
            }
            const name = displayNames[lang]
            if (name) {
                return name
            }
            try {
                const DisplayNames = (Intl as IntlWithDisplayNames).DisplayNames
                if (!DisplayNames) {
                    return lang
                }
                const ns = new DisplayNames([lang], { type: 'language' })
                return ns.of(lang) || lang
            } catch {
                return lang
            }
        }
    }
})
</script>
