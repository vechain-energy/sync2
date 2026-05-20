// eslint-disable-next-line @typescript-eslint/no-var-requires
const { notarize } = require('@electron/notarize')
const fs = require('fs')
const os = require('os')
const path = require('path')

function writeAppleApiKey() {
    if (process.env.APPLE_API_KEY_PATH) {
        return process.env.APPLE_API_KEY_PATH
    }

    if (!process.env.APPLE_API_KEY_BASE64) {
        return ''
    }

    const apiKeyPath = path.join(os.tmpdir(), `sync2-notary-${process.env.APPLE_API_KEY_ID}.p8`)
    fs.writeFileSync(apiKeyPath, Buffer.from(process.env.APPLE_API_KEY_BASE64, 'base64'), { mode: 0o600 })
    return apiKeyPath
}

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context

    if (electronPlatformName !== 'darwin') {
        return
    }

    const appleApiKey = writeAppleApiKey()
    if (!(process.env.APPLE_API_KEY_ID && process.env.APPLE_API_ISSUER && appleApiKey)) {
        console.warn(
            'Skipping macOS app notarization.' +
            ' Missing one or more environment vars (APPLE_API_KEY_ID, APPLE_API_ISSUER, APPLE_API_KEY_BASE64 or APPLE_API_KEY_PATH).'
        )
        return
    }

    const appName = context.packager.appInfo.productFilename

    return await notarize({
        tool: 'notarytool',
        appPath: `${appOutDir}/${appName}.app`,
        appleApiKey,
        appleApiKeyId: process.env.APPLE_API_KEY_ID,
        appleApiIssuer: process.env.APPLE_API_ISSUER
    })
}
