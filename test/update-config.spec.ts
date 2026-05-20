/* eslint-env mocha */
import * as assert from 'assert'
import { updateConfigPath, shouldCheckForUpdates } from '../src-electron/main-process/update-config'

describe('electron update config helpers', () => {
    it('checks for updates only when packaged metadata exists', () => {
        const resourcesPath = '/tmp/sync2/resources'
        const configPath = updateConfigPath(resourcesPath)
        const exists = (filePath: string) => filePath === configPath

        assert.strictEqual(shouldCheckForUpdates(resourcesPath, true, exists), true)
        assert.strictEqual(shouldCheckForUpdates(resourcesPath, false, exists), false)
        assert.strictEqual(shouldCheckForUpdates(resourcesPath, true, () => false), false)
    })
})
