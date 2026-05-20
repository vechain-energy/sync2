/* eslint-env mocha */
import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'

function sourceFile(relativePath: string): string {
    return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8')
}

describe('drawer interaction guards', () => {
    it('keeps swipe gestures away from the toolbar menu button', () => {
        const source = sourceFile('src/pages/Index/Controller.vue')
        const toolbarIndex = source.indexOf('<page-toolbar')
        const panRegionIndex = source.indexOf('class="drawer-pan-region column col"')

        assert.ok(toolbarIndex > -1)
        assert.ok(panRegionIndex > toolbarIndex)
        assert.strictEqual(source.slice(0, toolbarIndex).includes('v-touch-pan'), false)
        assert.ok(source.includes('v-touch-pan.right.prevent="handleDrawerTouchPan"'))
    })

    it('closes stale index drawers when leaving the wallet screen', () => {
        const source = sourceFile('src/pages/Index/Controller.vue')

        assert.ok(source.includes("'$route.name'(name: string)"))
        assert.ok(source.includes("if (name !== 'index')"))
        assert.ok(source.includes('this.closeDrawer()'))
        assert.ok(source.includes('closeDrawer()'))
        assert.ok(source.includes('this.drawerHandle()?.setOpened(false)'))
    })

    it('opens the toolbar action on pointer release before click fallback', () => {
        const source = sourceFile('src/components/PageToolbar.vue')

        assert.ok(source.includes('@pointerup.stop="onPointerUpNavButton"'))
        assert.strictEqual(source.includes('@pointerup.stop.prevent="onPointerUpNavButton"'), false)
        assert.strictEqual(source.includes('@click.stop.prevent="onClickNavButton"'), false)
        assert.ok(source.includes('@touchstart.stop="onTouchStartNavButton"'))
        assert.ok(source.includes('@touchend.stop="onTouchEndNavButton"'))
        assert.ok(source.includes('CLICK_SUPPRESSION_MS'))
        assert.ok(source.includes('TOUCH_TAP_MAX_MOVE_PX'))
        assert.ok(source.includes('runNavButtonActionOnce()'))
        assert.ok(source.includes('isPrimaryPointerRelease(event)'))
        assert.ok(source.includes("event.pointerType === 'mouse'"))
    })

    it('closes the drawer backdrop from pointer and touch taps', () => {
        const source = sourceFile('src/components/SideDrawer.vue')

        assert.ok(source.includes('@pointerup.stop="onBackdropPointerUp"'))
        assert.ok(source.includes('@touchend.stop="onBackdropTouchEnd"'))
        assert.ok(source.includes('closeFromBackdropOnce()'))
        assert.ok(source.includes('TAP_MAX_MOVE_PX'))
        assert.ok(source.includes('CLICK_SUPPRESSION_MS'))
    })

    it('limits drawer and stack transitions to animated properties', () => {
        const drawer = sourceFile('src/components/SideDrawer.vue')
        const stack = sourceFile('src/components/StackedRouterView.vue')

        assert.strictEqual(drawer.includes('transition: all'), false)
        assert.strictEqual(stack.includes('transition: all'), false)
        assert.ok(drawer.includes('transition:\n        transform'))
        assert.ok(stack.includes('transition:\n        transform'))
    })
})
