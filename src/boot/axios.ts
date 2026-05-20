import axios, { AxiosInstance } from 'axios'
import { defineBoot } from '@quasar/app-webpack/wrappers'

declare module 'vue' {
    interface ComponentCustomProperties {
        $axios: AxiosInstance;
    }
}

export default defineBoot(({ app }) => {
    app.config.globalProperties.$axios = axios.create({ timeout: 30 * 1000 })
})
