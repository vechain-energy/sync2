import {
    app,
    BrowserWindow,
    nativeTheme,
    webContents,
    dialog
} from 'electron'
import * as remoteMain from '@electron/remote/main'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { setupMenu } from './menu'
import { newUpdater } from './updater'

remoteMain.initialize()

const currentDir = fileURLToPath(new URL('.', import.meta.url))

let mainWindow: BrowserWindow | null

async function createWindow() {
    /**
     * Initial window options
     */
    mainWindow = new BrowserWindow({
        minWidth: 320,
        minHeight: 520,
        width: 360,
        height: 640,
        useContentSize: true,
        webPreferences: {
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            contextIsolation: false
        }
    })

    remoteMain.enable(mainWindow.webContents)

    if (process.env.DEV) {
        await mainWindow.loadURL(process.env.APP_URL!)
    } else {
        await mainWindow.loadFile('index.html')
    }

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

function extractConnexUrl(argv: string[]) {
    return argv.find(a => a && a.startsWith('connex:'))
}

function setupOpenUrlEmitter(): (url: string) => void {
    // works for cold/hot start up
    let pendingUrl = ''
    let resolver: [number, (url: string) => void] | undefined

    app.listenOpenUrl = webContentId => {
        return new Promise(resolve => {
            if (pendingUrl) {
                resolve(pendingUrl)
                pendingUrl = ''
            } else {
                resolver = [webContentId, resolve]
            }
        })
    }
    return (url) => {
        if (resolver && webContents.fromId(resolver[0])) {
            resolver[1](url)
            resolver = undefined
        } else {
            pendingUrl = url
        }
    }
}

async function setupDevelopmentTools() {
    if (!process.env.DEV) {
        return
    }

    const { default: electronDebug } = await import('electron-debug')
    electronDebug({ showDevTools: true })

    try {
        const { default: installExtension, VUEJS_DEVTOOLS } = await import('electron-devtools-installer')
        await installExtension(VUEJS_DEVTOOLS)
    } catch (err) {
        console.log('Unable to install `vue-devtools`: \n', err)
    }
}

(() => {
    if (process.env.PROD) {
        if (!app.requestSingleInstanceLock()) {
            app.quit()
            return
        }

        app.setAsDefaultProtocolClient('connex')
    }

    try {
        if (process.platform === 'win32' && nativeTheme.shouldUseDarkColors === true) {
            fs.unlinkSync(path.join(app.getPath('userData'), 'DevTools Extensions'))
        }
    } catch { }

    /**
     * Set `__statics` path to static files in production;
     * The reason we are setting it here is that the path needs to be evaluated at runtime
     */
    if (process.env.PROD) {
        globalThis.__statics = path.join(currentDir, 'statics').replace(/\\/g, '\\\\')
    }

    app.updater = newUpdater()
    const emitUrl = setupOpenUrlEmitter()
    app.on('open-url', (ev, url) => {
        if (url.startsWith('connex:')) {
            ev.preventDefault()
            emitUrl(url)
            if (app.isReady()) {
                mainWindow || void createWindow()
            }
        }
    }).on('second-instance', (ev, argv) => {
        const url = extractConnexUrl(argv)
        url && emitUrl(url)
        mainWindow || void createWindow()
        mainWindow && mainWindow.focus()
    }).on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit()
        }
    }).on('activate', () => {
        mainWindow || void createWindow()
    }).on('ready', async () => {
        await setupDevelopmentTools()
        setupMenu()
        if (process.env.PROD) {
            if (process.platform === 'darwin') {
                if (!app.isInApplicationsFolder()) {
                    if (dialog.showMessageBoxSync({
                        message: `${app.name} is not in Application folder, move there?`,
                        type: 'question',
                        buttons: ['OK', 'Cancel']
                    }) === 0) {
                        try {
                            app.moveToApplicationsFolder()
                            return
                        } catch { }
                    }
                }
            }
            void app.updater.check()
            setInterval(() => {
                void app.updater.check()
            }, 24 * 3600 * 1000)

            const initUrl = extractConnexUrl(process.argv)
            initUrl && emitUrl(initUrl)
        }

        await createWindow()
    })
})()
