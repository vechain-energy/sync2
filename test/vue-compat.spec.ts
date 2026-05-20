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
    it('does not rely on unsupported hook:beforeUnmount event cleanup', () => {
        const root = path.join(__dirname, '..', 'src')
        const offenders = sourceFiles(root)
            .filter(file => fs.readFileSync(file, 'utf8').includes('hook:beforeUnmount'))
            .map(file => path.relative(path.join(__dirname, '..'), file))

        assert.deepStrictEqual(offenders, [])
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
})
