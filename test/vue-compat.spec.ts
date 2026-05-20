/* eslint-env mocha */
import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'

function sourceFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    return entries.flatMap(entry => {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            return sourceFiles(fullPath)
        }
        return /\.(ts|vue)$/.test(entry.name) ? [fullPath] : []
    })
}

describe('Vue compat migration guards', () => {
    it('does not ship the Vue compatibility build', () => {
        const root = path.join(__dirname, '..')
        const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8')
        const quasarConfig = fs.readFileSync(path.join(root, 'quasar.config.cjs'), 'utf8')
        const boot = fs.readFileSync(path.join(root, 'src/boot/misc/index.ts'), 'utf8')

        assert.strictEqual(packageJson.includes('@vue/compat'), false)
        assert.strictEqual(quasarConfig.includes('@vue/compat'), false)
        assert.strictEqual(quasarConfig.includes('compatConfig'), false)
        assert.strictEqual(boot.includes('@vue/compat'), false)
        assert.strictEqual(boot.includes('configureCompat'), false)
    })

    it('does not rely on unsupported hook:beforeUnmount event cleanup', () => {
        const root = path.join(__dirname, '..', 'src')
        const offenders = sourceFiles(root)
            .filter(file => fs.readFileSync(file, 'utf8').includes('hook:beforeUnmount'))
            .map(file => path.relative(path.join(__dirname, '..'), file))

        assert.deepStrictEqual(offenders, [])
    })

    it('keeps router stack scope detection compatible with Vue 3 route records', () => {
        const stack = fs.readFileSync(path.join(__dirname, '..', 'src/router/stack.ts'), 'utf8')

        assert.ok(stack.includes('recordOwnsView'))
        assert.ok(stack.includes('vm.$?.type === component'))
        assert.ok(stack.includes('inferScopeRoot(entries)'))
    })

    it('registers the route stack before router install captures initial navigation', () => {
        const router = fs.readFileSync(path.join(__dirname, '..', 'src/router/index.ts'), 'utf8')
        const stackInstall = router.indexOf('app.use(stack)')
        const routerInstall = router.indexOf('install.call(Router, app)')

        assert.ok(stackInstall >= 0)
        assert.ok(routerInstall >= 0)
        assert.ok(stackInstall < routerInstall)
    })

    it('renders stacked routes through the Vue Router 4 RouterView slot', () => {
        const stackView = fs.readFileSync(path.join(__dirname, '..', 'src/components/StackedRouterView.vue'), 'utf8')

        assert.ok(stackView.includes('<router-view'))
        assert.ok(stackView.includes(':route="entry"'))
        assert.ok(stackView.includes('v-slot="{ Component }"'))
        assert.ok(stackView.includes(':is="Component"'))
    })

    it('does not rely on legacy listener or scoped slot aliases', () => {
        const root = path.join(__dirname, '..', 'src')
        const legacyPatterns = [/\$listeners/, /\$scopedSlots/, /\$on\(/, /\$once\(/, /\$off\(/]
        const offenders = sourceFiles(root)
            .filter(file => legacyPatterns.some(pattern => pattern.test(fs.readFileSync(file, 'utf8'))))
            .map(file => path.relative(path.join(__dirname, '..'), file))

        assert.deepStrictEqual(offenders, [])
    })

    it('uses Vue 3 render functions without injected h arguments', () => {
        const root = path.join(__dirname, '..', 'src')
        const offenders = sourceFiles(root)
            .filter(file => /render\s*\(\s*h\s*\)/.test(fs.readFileSync(file, 'utf8')))
            .map(file => path.relative(path.join(__dirname, '..'), file))

        assert.deepStrictEqual(offenders, [])
    })

    it('declares custom events emitted by components', () => {
        const root = path.join(__dirname, '..', 'src')
        const offenders = sourceFiles(root)
            .filter(file => {
                const source = fs.readFileSync(file, 'utf8')
                return /\$emit\(\s*['"]/.test(source) && !/\bemits\s*:/.test(source)
            })
            .map(file => path.relative(path.join(__dirname, '..'), file))

        assert.deepStrictEqual(offenders, [])
    })

    it('does not use legacy custom input events for QR scanner results', () => {
        const scanner = fs.readFileSync(path.join(__dirname, '..', 'src/pages/QrScannerDialog/Scanner.vue'), 'utf8')
        const controller = fs.readFileSync(path.join(__dirname, '..', 'src/pages/QrScannerDialog/Controller.vue'), 'utf8')

        assert.strictEqual(scanner.includes("$emit('input'"), false)
        assert.strictEqual(scanner.includes("emits: ['input'"), false)
        assert.strictEqual(controller.includes('@input="onScanned"'), false)
        assert.ok(scanner.includes("$emit('scan'"))
        assert.ok(controller.includes('@scan="onScanned"'))
    })

    it('allows manual async-computed updates when automatic updates are disabled', () => {
        const asyncComputed = fs.readFileSync(path.join(__dirname, '..', 'src/boot/misc/async-computed.ts'), 'utf8')

        assert.ok(asyncComputed.includes('force = false'))
        assert.ok(asyncComputed.includes("!force && typeof entry !== 'function' && entry.shouldUpdate"))
        assert.ok(asyncComputed.includes('resolveAsyncComputed(vm, key, entry, runId, true)'))
    })

    it('does not call removed Vue 2 instance mutation helpers', () => {
        const source = fs.readFileSync(path.join(__dirname, '..', 'src/pages/NodesSetting/Controller.vue'), 'utf8')

        assert.strictEqual(source.includes('this.$set('), false)
        assert.ok(source.includes('this.activeMap = {'))
    })

    it('does not bind removed Quasar 1 slot event bags', () => {
        const source = fs.readFileSync(path.join(__dirname, '..', 'src/pages/Swap/Controller.vue'), 'utf8')

        assert.strictEqual(source.includes('scope.itemEvents'), false)
        assert.ok(source.includes('v-bind="scope.itemProps"'))
    })

    it('does not depend on component instance i18n inside network display helper closures', () => {
        const source = fs.readFileSync(path.join(__dirname, '..', 'src/boot/misc/index.ts'), 'utf8')

        assert.ok(source.includes("import { i18n } from 'src/boot/i18n'"))
        assert.ok(source.includes("i18n.global.t('common.mainnet')"))
        assert.strictEqual(source.includes("vm.$t('common.mainnet')"), false)
    })
})
