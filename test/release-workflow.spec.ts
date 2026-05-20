/* eslint-env mocha */
import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'

describe('release workflow guards', () => {
    it('validates the app before creating a release draft', () => {
        const workflow = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/release.yaml'), 'utf8')
        const validationIndex = workflow.indexOf('release-validation:')
        const createReleaseIndex = workflow.indexOf('create-gh-release:')
        const releaseNeedsIndex = workflow.indexOf('- release-validation', createReleaseIndex)

        assert.ok(createReleaseIndex >= 0)
        assert.ok(validationIndex > createReleaseIndex)
        assert.ok(releaseNeedsIndex > createReleaseIndex)
        assert.ok(workflow.includes('run: npm audit --omit=dev'))
        assert.ok(workflow.includes('run: npm run typecheck'))
        assert.ok(workflow.includes('run: npm run lint'))
        assert.ok(workflow.includes('run: npm test'))
        assert.ok(workflow.includes('run: npm run build'))
        assert.ok(workflow.includes('run: npm run build:pwa'))
    })

    it('publishes Electron artifacts explicitly to the release draft', () => {
        const workflow = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/release.yaml'), 'utf8')
        const explicitPublishCommands = workflow.match(/npx quasar build -m electron --publish onTagOrDraft/g) || []

        assert.strictEqual(explicitPublishCommands.length, 2)
        assert.ok(workflow.includes('Create draft GitHub Release'))
        assert.ok(workflow.includes('GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}'))
    })
})
