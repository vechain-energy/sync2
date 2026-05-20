import path from 'path'

export const updateConfigFileName = 'app-update.yml'

export function updateConfigPath(resourcesPath: string) {
    return path.join(resourcesPath, updateConfigFileName)
}

export function shouldCheckForUpdates(
    resourcesPath: string,
    isPackaged: boolean,
    exists: (filePath: string) => boolean
) {
    return isPackaged && exists(updateConfigPath(resourcesPath))
}
