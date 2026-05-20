/* eslint-env mocha */
import * as assert from 'assert'
import { updateConfigPath, shouldCheckForUpdates } from '../src-electron/main-process/update-config'

type ReleaseRepo = {
    owner: string
    repo: string
}

type ReleaseConfigModule = {
    getElectronReleaseRepo: (env: Record<string, string | undefined>) => ReleaseRepo
    parseRepoSlug: (value: string | undefined) => ReleaseRepo | null
}

const releaseConfig = require('../build/release-config.cjs') as ReleaseConfigModule

describe('electron update config helpers', () => {
    it('checks for updates only when packaged metadata exists', () => {
        const resourcesPath = '/tmp/sync2/resources'
        const configPath = updateConfigPath(resourcesPath)
        const exists = (filePath: string) => filePath === configPath

        assert.strictEqual(shouldCheckForUpdates(resourcesPath, true, exists), true)
        assert.strictEqual(shouldCheckForUpdates(resourcesPath, false, exists), false)
        assert.strictEqual(shouldCheckForUpdates(resourcesPath, true, () => false), false)
    })

    it('resolves the release feed from fork repository settings', () => {
        assert.deepStrictEqual(releaseConfig.getElectronReleaseRepo({
            ELECTRON_RELEASE_OWNER: 'operator',
            ELECTRON_RELEASE_REPO: 'sync2-fork'
        }), { owner: 'operator', repo: 'sync2-fork' })

        assert.deepStrictEqual(releaseConfig.getElectronReleaseRepo({
            GITHUB_REPOSITORY: 'vechain-energy/sync2'
        }), { owner: 'vechain-energy', repo: 'sync2' })

        assert.deepStrictEqual(
            releaseConfig.parseRepoSlug('git@github.com:vechain-energy/sync2.git'),
            { owner: 'vechain-energy', repo: 'sync2' }
        )

        assert.deepStrictEqual(releaseConfig.getElectronReleaseRepo({}), {
            owner: 'vechain-energy',
            repo: 'sync2'
        })
    })
})
