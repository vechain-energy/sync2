// cordova only functions

export const deviceReady = new Promise<void>(resolve => {
    document.addEventListener('deviceready', () => resolve(), false)
})
