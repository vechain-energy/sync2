import { defineComponent } from 'vue'

/* example:
<delay-render :t="100">
  <!-- content rendering will be delayed in 100ms -->
</delay-render>
*/
export default defineComponent({
    props: {
        tag: String,
        t: Number
    },
    data: () => {
        return {
            timer: null as ReturnType<typeof setTimeout> | null,
            timeUp: false
        }
    },
    created() {
        this.timer = setTimeout(() => {
            this.timeUp = true
        }, this.t)
    },
    beforeUnmount() {
        if (this.timer) {
            clearTimeout(this.timer)
        }
    },
    render(h) {
        if (this.timeUp) {
            const slots = this.$slots.default || []
            if (this.tag) {
                return h(this.tag, slots)
            }
            return slots.length > 1 ? h('fragment', slots) : slots[0]
        }
        return h()
    }
})
