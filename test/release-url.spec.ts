/* eslint-env mocha */
import * as assert from 'assert'
import { latestReleaseUrl, releaseUrlForVersion } from '../src/utils/release-url'

describe('release URL helpers', () => {
    it('links update versions to their GitHub release tag', () => {
        assert.strictEqual(
            releaseUrlForVersion('2.4.2'),
            'https://github.com/vechain-energy/sync2/releases/tag/v2.4.2'
        )
        assert.strictEqual(
            releaseUrlForVersion('2.4.2-beta.1'),
            'https://github.com/vechain-energy/sync2/releases/tag/v2.4.2-beta.1'
        )
    })

    it('falls back to latest releases when updater metadata is missing', () => {
        assert.strictEqual(latestReleaseUrl(), 'https://github.com/vechain-energy/sync2/releases/latest')
        assert.strictEqual(releaseUrlForVersion(''), latestReleaseUrl())
        assert.strictEqual(releaseUrlForVersion('v2.4.2'), latestReleaseUrl())
        assert.strictEqual(releaseUrlForVersion('bad/version'), latestReleaseUrl())
    })
})
