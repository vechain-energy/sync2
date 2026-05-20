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
        assert.ok(workflow.includes('ELECTRON_RELEASE_OWNER: ${{ github.repository_owner }}'))
        assert.ok(workflow.includes('ELECTRON_RELEASE_REPO: ${{ github.event.repository.name }}'))
    })

    it('warns when macOS signing secrets are missing but still builds manual assets', () => {
        const workflow = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/release.yaml'), 'utf8')

        assert.ok(workflow.includes('Report macOS signing secrets'))
        assert.ok(workflow.includes('MACOS_CSC_LINK'))
        assert.ok(workflow.includes('MACOS_CSC_KEY_PASSWORD'))
        assert.ok(workflow.includes('APPLE_API_KEY_ID'))
        assert.ok(workflow.includes('APPLE_API_ISSUER'))
        assert.ok(workflow.includes('APPLE_API_KEY_BASE64'))
        assert.ok(workflow.includes('macOS auto-update needs a signed and notarized release'))
        assert.ok(workflow.includes('Continuing with unsigned macOS assets for manual download'))
        assert.strictEqual(workflow.includes('exit "$missing"'), false)
    })
})
