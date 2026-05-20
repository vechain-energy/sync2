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

    it('opens the toolbar action on pointer release before click fallback', () => {
        const source = sourceFile('src/components/PageToolbar.vue')

        assert.ok(source.includes('@pointerup.stop.prevent="onPointerUpNavButton"'))
        assert.ok(source.includes('@touchstart.stop'))
        assert.ok(source.includes('CLICK_SUPPRESSION_MS'))
    })
})
