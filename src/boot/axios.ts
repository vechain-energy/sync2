import axios, { AxiosInstance } from 'axios'
import { boot } from 'quasar/wrappers'
import { VueConstructor } from 'vue'

type BootParams = {
    Vue: VueConstructor
}

declare module 'vue/types/vue' {
    interface Vue {
        $axios: AxiosInstance;
    }
}

export default boot(({ Vue }: BootParams) => {
    Vue.prototype.$axios = axios.create({ timeout: 30 * 1000 })
})
