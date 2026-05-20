import { defineComponent, h, renderSlot, VNode } from 'vue'

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
    render(): VNode | VNode[] | null {
        if (this.timeUp) {
            const slot = renderSlot(this.$slots, 'default')
            if (this.tag) {
                return h(this.tag, [slot])
            }
            return slot
        }
        return null
    }
})
