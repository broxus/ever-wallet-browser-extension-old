import * as nt from '@nekoton'
import { Mutex } from '@broxus/await-semaphore'
import { NekotonRpcError } from '@shared/utils'
import { RpcErrorCode } from '@shared/errors'

import { BACKGROUND_POLLING_INTERVAL, NEXT_BLOCK_TIMEOUT } from './constants'
import { ConnectionController } from '../ConnectionController'

export interface ITonWalletHandler {
    onMessageSent(pendingTransaction: nt.PendingTransaction, transaction: nt.Transaction): void

    onMessageExpired(pendingTransaction: nt.PendingTransaction): void

    onStateChanged(newState: nt.ContractState): void

    onTransactionsFound(
        transactions: Array<nt.TonWalletTransaction>,
        info: nt.TransactionsBatchInfo
    ): void
}

export class TonWalletSubscription {
    private readonly _connection: nt.GqlConnection
    private readonly _address: string
    private readonly _tonWallet: nt.TonWallet
    private readonly _tonWalletMutex: Mutex = new Mutex()
    private _releaseConnection?: () => void
    private _loopPromise?: Promise<void>
    private _refreshTimer?: [number, () => void]
    private _pollingInterval: number = BACKGROUND_POLLING_INTERVAL
    private _currentPollingMethod: typeof nt.TonWallet.prototype.pollingMethod
    private _isRunning: boolean = false
    private _currentBlockId?: string
    private _suggestedBlockId?: string

    public static async subscribe(
        connectionController: ConnectionController,
        publicKey: string,
        contractType: nt.ContractType,
        handler: ITonWalletHandler
    ) {
        const {
            connection: {
                data: { connection },
            },
            release,
        } = await connectionController.acquire()

        try {
            const tonWallet = await connection.subscribeToTonWallet(
                publicKey,
                contractType,
                handler
            )

            return new TonWalletSubscription(connection, release, tonWallet)
        } catch (e) {
            release()
            throw e
        }
    }

    private constructor(
        connection: nt.GqlConnection,
        release: () => void,
        tonWallet: nt.TonWallet
    ) {
        this._releaseConnection = release
        this._connection = connection
        this._address = tonWallet.address
        this._tonWallet = tonWallet
        this._currentPollingMethod = this._tonWallet.pollingMethod
    }

    public setPollingInterval(interval: number) {
        this._pollingInterval = interval
    }

    public async start() {
        if (this._releaseConnection == null) {
            throw new NekotonRpcError(
                RpcErrorCode.INTERNAL,
                'Wallet subscription must not be started after being closed'
            )
        }

        if (this._loopPromise) {
            console.debug('TonWalletSubscription -> awaiting loop promise')
            await this._loopPromise
        }

        console.debug('TonWalletSubscription -> loop started')

        this._loopPromise = new Promise<void>(async (resolve) => {
            this._isRunning = true
            let previousPollingMethod = this._currentPollingMethod
            outer: while (this._isRunning) {
                const pollingMethodChanged = previousPollingMethod != this._currentPollingMethod
                previousPollingMethod = this._currentPollingMethod

                switch (this._currentPollingMethod) {
                    case 'manual': {
                        this._currentBlockId = undefined

                        console.debug('TonWalletSubscription -> manual -> waiting begins')

                        await new Promise<void>((resolve) => {
                            const timerHandle = window.setTimeout(() => {
                                this._refreshTimer = undefined
                                resolve()
                            }, this._pollingInterval)
                            this._refreshTimer = [timerHandle, resolve]
                        })

                        console.debug('TonWalletSubscription -> manual -> waining ends')

                        if (!this._isRunning) {
                            break outer
                        }

                        console.debug('TonWalletSubscription -> manual -> refreshing begins')

                        try {
                            this._currentPollingMethod = await this._tonWalletMutex.use(
                                async () => {
                                    await this._tonWallet.refresh()
                                    return this._tonWallet.pollingMethod
                                }
                            )
                        } catch (e) {
                            console.error(`Error during account refresh (${this._address})`, e)
                        }

                        console.debug('TonWalletSubscription -> manual -> refreshing ends')

                        break
                    }
                    case 'reliable': {
                        console.debug('TonWalletSubscription -> reliable start')

                        if (pollingMethodChanged && this._suggestedBlockId != null) {
                            this._currentBlockId = this._suggestedBlockId
                        }
                        this._suggestedBlockId = undefined

                        let nextBlockId: string
                        if (this._currentBlockId == null) {
                            console.warn('Starting reliable connection with unknown block')

                            try {
                                const latestBlock = await this._connection.getLatestBlock(
                                    this._address
                                )
                                this._currentBlockId = latestBlock.id
                                nextBlockId = this._currentBlockId
                            } catch (e) {
                                console.error(`Failed to get latest block for ${this._address}`, e)
                                continue // retry
                            }
                        } else {
                            try {
                                nextBlockId = await this._connection.waitForNextBlock(
                                    this._currentBlockId,
                                    this._address,
                                    NEXT_BLOCK_TIMEOUT
                                )
                            } catch (e) {
                                console.debug(
                                    `Failed to wait for next block for ${this._address}`,
                                    e
                                )
                                continue // retry
                            }
                        }

                        try {
                            this._currentPollingMethod = await this._tonWalletMutex.use(
                                async () => {
                                    await this._tonWallet.handleBlock(nextBlockId)
                                    return this._tonWallet.pollingMethod
                                }
                            )
                            this._currentBlockId = nextBlockId
                        } catch (e) {
                            console.error(`Failed to handle block for ${this._address}`, e)
                        }

                        break
                    }
                }
            }

            console.debug('TonWalletSubscription -> loop finished')

            resolve()
        })
    }

    public skipRefreshTimer() {
        window.clearTimeout(this._refreshTimer?.[0])
        this._refreshTimer?.[1]()
        this._refreshTimer = undefined
    }

    public async pause() {
        if (!this._isRunning) {
            return
        }

        this._isRunning = false

        this.skipRefreshTimer()

        await this._loopPromise
        this._loopPromise = undefined

        this._currentPollingMethod = await this._tonWalletMutex.use(async () => {
            return this._tonWallet.pollingMethod
        })

        this._currentBlockId = undefined
        this._suggestedBlockId = undefined
    }

    public async stop() {
        await this.pause()
        this._tonWallet.free()
        this._releaseConnection?.()
        this._releaseConnection = undefined
    }

    public async prepareReliablePolling() {
        try {
            this._suggestedBlockId = (await this._connection.getLatestBlock(this._address)).id
        } catch (e) {
            throw new NekotonRpcError(RpcErrorCode.RESOURCE_UNAVAILABLE, e.toString())
        }
    }

    public async use<T>(f: (wallet: nt.TonWallet) => Promise<T>) {
        const release = await this._tonWalletMutex.acquire()
        return f(this._tonWallet)
            .then((res) => {
                release()
                return res
            })
            .catch((err) => {
                release()
                throw err
            })
    }
}
