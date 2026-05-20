const releaseBaseUrl = 'https://github.com/vechain-energy/sync2/releases'
const releaseVersionPattern = /^[0-9]+(\.[0-9]+)*(-[0-9A-Za-z.-]+)?$/

export function latestReleaseUrl(): string {
    return `${releaseBaseUrl}/latest`
}

export function releaseUrlForVersion(version?: string | null): string {
    const value = version?.trim()
    if (!value || !releaseVersionPattern.test(value)) {
        return latestReleaseUrl()
    }

    return `${releaseBaseUrl}/tag/v${value}`
}
