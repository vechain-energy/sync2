import { App, AppContext, ComponentPublicInstance, createVNode, render, VNode } from 'vue'
import AuthenticationDialog from 'pages/AuthenticationDialog'
import ModalLoading from 'components/ModalLoading.vue'
import QRCodeDialog from 'pages/QRCodeDialog.vue'
import { CertDialog, TxDialog } from 'pages/Sign'
import { QDialogOptions } from 'quasar'
import { BioPass } from 'src/utils/bio-pass'

type LegacyDialogOptions = QDialogOptions & Record<string, unknown>

declare module 'vue' {
    interface ComponentCustomProperties {
        $dialog<T>(options: LegacyDialogOptions): Promise<T>

        /**
         * pop up the authentication dialog to ask user entering password
         * @returns user master key
         */
        $authenticate(): Promise<Buffer>

        /**
         * protected the async task with a loading mask
         * @param task the async task
         * @returns the result of the task
         */
        $loading<T>(task: () => Promise<T>): Promise<T>

        /**
         * sign tx
         * @param gid desired genesis id of user wallet
         * @param req request content
         */
        $signTx(
            gid: string,
            req: M.TxRequest
        ): Promise<M.TxResponse>

        /**
         * sign cert
         * @param gid desired genesis id of user wallet
         * @param req request content
         */
        $signCert(
            gid: string,
            req: M.CertRequest
        ): Promise<M.CertResponse>

        /**
         * qr code dialog
         * @param req
         */
        $qrcode(req: M.QRRequest): void
    }
}

const loadingFunc = (() => {
    let counter = 0
    let vnode: VNode | undefined
    let node: HTMLDivElement | undefined
    return async <T>(appContext: AppContext, task: () => Promise<T>) => {
        try {
            if (counter++ === 0) {
                // set 0 delay to block mouse/touch event
                node = document.createElement('div')
                document.body.appendChild(node)
                vnode = createVNode(ModalLoading)
                vnode.appContext = appContext
                render(vnode, node)
            }
            return await task()
        } finally {
            if (--counter === 0) {
                node && render(null, node)
                node && node.remove()
                vnode = undefined
                node = undefined
            }
        }
    }
})()

const dialogOptionKeys = new Set([
    'class',
    'style',
    'title',
    'message',
    'html',
    'position',
    'prompt',
    'options',
    'progress',
    'ok',
    'cancel',
    'focus',
    'stackButtons',
    'color',
    'dark',
    'persistent',
    'noEscDismiss',
    'noBackdropDismiss',
    'noRouteDismiss',
    'seamless',
    'maximized',
    'fullWidth',
    'fullHeight',
    'transitionShow',
    'transitionHide',
    'component',
    'componentProps'
])

function normalizeDialogOptions(options: LegacyDialogOptions): QDialogOptions {
    const normalized: LegacyDialogOptions = { ...options }
    delete normalized.parent

    if (!normalized.component) {
        return normalized
    }

    const props: Record<string, unknown> = {}
    const componentProps = normalized.componentProps
    if (componentProps && typeof componentProps === 'object' && !Array.isArray(componentProps)) {
        Object.assign(props, componentProps as Record<string, unknown>)
    }

    for (const key of Object.keys(normalized)) {
        if (!dialogOptionKeys.has(key)) {
            props[key] = normalized[key]
            delete normalized[key]
        }
    }

    if (Object.keys(props).length > 0) {
        normalized.componentProps = props
    }
    return normalized
}

function dialog<T>(vm: ComponentPublicInstance, options: LegacyDialogOptions) {
    return new Promise<T>((resolve, reject) => {
        vm.$q.dialog(normalizeDialogOptions(options))
            .onOk(resolve)
            .onCancel(() => reject(new Error('cancelled')))
    })
}

export function boot(app: App) {
    const appContext = app._context

    Object.defineProperties(app.config.globalProperties, {
        $dialog: {
            get(): ComponentPublicInstance['$dialog'] {
                const vm = this as ComponentPublicInstance
                return (options) => {
                    return dialog(vm, options)
                }
            }
        },
        $loading: {
            get(): ComponentPublicInstance['$loading'] {
                return async (task) => {
                    return loadingFunc(appContext, task)
                }
            }
        },
        $authenticate: {
            get(): ComponentPublicInstance['$authenticate'] {
                const vm = this as ComponentPublicInstance
                return async () => {
                    try {
                        const bioPass = await BioPass.open()
                        if (bioPass && await vm.$svc.config.getBioPassOn()) {
                            return Buffer.from(await bioPass.recall(vm.$t('bioAuth.title').toString(), vm.$t('common.cancel').toString()), 'hex')
                        }
                    } catch (err) {
                        if (err.code === -108 /* BIOMETRIC_DISMISSED */) {
                            throw err
                        }
                        console.warn(err)
                    }
                    return dialog(vm, {
                        component: AuthenticationDialog
                    })
                }
            }
        },
        $signTx: {
            get(): ComponentPublicInstance['$signTx'] {
                const vm = this as ComponentPublicInstance
                return (gid, req) => {
                    return dialog(vm, {
                        component: TxDialog,
                        gid,
                        req
                    })
                }
            }
        },
        $signCert: {
            get(): ComponentPublicInstance['$signCert'] {
                const vm = this as ComponentPublicInstance
                return (gid, req) => {
                    return dialog(vm, {
                        component: CertDialog,
                        gid,
                        req
                    })
                }
            }
        },
        $qrcode: {
            get(): ComponentPublicInstance['$qrcode'] {
                const vm = this as ComponentPublicInstance
                return (req) => {
                    return dialog(vm, {
                        component: QRCodeDialog,
                        req
                    })
                }
            }
        }
    })
}
