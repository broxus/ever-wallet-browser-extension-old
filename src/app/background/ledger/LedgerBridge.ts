const { EventEmitter } = require('events')

const BRIDGE_URL = 'https://broxus.github.io/everscale-ledger-bridge'

type IBridgeApi = {
    'ledger-get-public-key': {
        input: {
            account: number
        }
        output: {
            publicKey: Uint8Array
            error: Error
        }
    }
    'ledger-sign-hash': {
        input: {
            account: number
            message: Uint8Array
        }
        output: {
            signature: Uint8Array
            error: Error
        }
    }
    'ledger-close-bridge': {
        input: {}
        output: {}
    }
}

type IBridgeResponse<T extends keyof IBridgeApi> =
    | {
          success: true
          payload: IBridgeApi[T]['output']
          error: undefined
      }
    | { success: false; payload: undefined; error: Error | undefined }

export default class LedgerBridge extends EventEmitter {
    private readonly bridgeUrl: string = BRIDGE_URL
    private readonly perPage = 5
    private page: number = 0
    private iframe?: HTMLIFrameElement
    private iframeLoaded: boolean = false

    constructor() {
        super()
        this._setupIframe()
    }

    public getFirstPage() {
        this.page = 0
        return this.__getPage(1)
    }

    public getNextPage() {
        return this.__getPage(1)
    }

    public getPreviousPage() {
        return this.__getPage(-1)
    }

    public async getPublicKey(account: number) {
        const { success, payload, error } = await this._sendMessage('ledger-get-public-key', {
            account,
        })

        if (success && payload) {
            return payload.publicKey
        } else {
            throw error || new Error('Unknown error')
        }
    }

    public async signHash(account: number, message: Uint8Array) {
        const { success, payload, error } = await this._sendMessage('ledger-sign-hash', {
            account,
            message,
        })

        if (success && payload) {
            return payload.signature
        } else {
            throw error || new Error('Unknown error')
        }
    }

    public async close() {
        const { success, error } = await this._sendMessage('ledger-close-bridge', {})

        if (success) {
            return
        } else {
            throw error || new Error('Unknown error')
        }
    }

    private _setupIframe() {
        this.iframe = document.createElement('iframe')
        this.iframe.src = this.bridgeUrl
        this.iframe.allow = 'hid'
        this.iframe.onload = async () => {
            this.iframeLoaded = true
        }
        document.body.appendChild(this.iframe)
    }

    private _getOrigin() {
        const tmp = this.bridgeUrl.split('/')
        tmp.splice(-1, 1)
        return tmp.join('/')
    }

    private _sendMessage<T extends keyof IBridgeApi>(
        action: T,
        params: IBridgeApi[T]['input']
    ): Promise<IBridgeResponse<T>> {
        const message = {
            target: 'LEDGER-IFRAME',
            action,
            params,
        }

        return new Promise<IBridgeResponse<T>>((resolve, reject) => {
            const eventListener = ({ origin, data }: MessageEvent) => {
                if (origin !== this._getOrigin()) {
                    reject(new Error('Invalid origin'))
                }

                window.removeEventListener('message', eventListener)

                if (data && data.action && data.action === `${message.action}-reply`) {
                    resolve(data)
                } else {
                    reject(new Error('Invalid reply'))
                }

                reject(new Error('Unknown error'))
            }
            window.addEventListener('message', eventListener)

            this.iframe?.contentWindow?.postMessage(message, '*')
        })
    }

    private async _getPublicKeys(from: number, to: number) {
        const publicKeys = []
        for (let i = from; i < to; i++) {
            const publicKey = await this.getPublicKey(i)
            publicKeys.push({
                publicKey: Buffer.from(publicKey).toString('hex'),
                index: i,
            })
        }
        return publicKeys
    }

    private async __getPage(increment: number) {
        this.page += increment

        if (this.page <= 0) {
            this.page = 1
        }
        const from = (this.page - 1) * this.perPage
        const to = from + this.perPage

        return await this._getPublicKeys(from, to)
    }
}
