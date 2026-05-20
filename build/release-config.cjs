const defaultReleaseRepo = {
  owner: 'vechain-energy',
  repo: 'sync2'
}

function cleanPart(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseRepoSlug(value) {
  const clean = cleanPart(value)
    .replace(/^git@github\.com:/, '')
    .replace(/^https:\/\/github\.com\//, '')
    .replace(/\.git$/, '')

  const parts = clean.split('/').filter(Boolean)
  if (parts.length < 2) {
    return null
  }

  return {
    owner: parts[0],
    repo: parts[1]
  }
}

function getElectronReleaseRepo(env) {
  const owner = cleanPart(env.ELECTRON_RELEASE_OWNER)
  const repo = cleanPart(env.ELECTRON_RELEASE_REPO)
  if (owner && repo) {
    return { owner, repo }
  }

  return parseRepoSlug(env.ELECTRON_RELEASE_REPOSITORY) ||
    parseRepoSlug(env.GITHUB_REPOSITORY) ||
    defaultReleaseRepo
}

module.exports = {
  defaultReleaseRepo,
  getElectronReleaseRepo,
  parseRepoSlug
}
