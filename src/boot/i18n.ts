import { defineBoot } from '@quasar/app-webpack/wrappers'
import messages from 'src/i18n'
import { createI18n } from 'vue-i18n'

export const i18n = createI18n({
    legacy: true,
    locale: 'en-us',
    fallbackLocale: 'en-us',
    messages,
    fallbackWarn: false
})

export default defineBoot(({ app }) => {
    app.use(i18n)
})
