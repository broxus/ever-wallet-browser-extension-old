import { BaseConfig, BaseController, BaseState } from './BaseController'

const DEFAULT_NOTIFICATION_TIMEOUT = 60000 // 60s

export interface NotificationControllerConfig extends BaseConfig {}

export interface NotificationControllerState extends BaseState {}

export interface INotification {
    title: string
    body: string
    link?: string
    eventTime?: number
    timeout?: number
}

export class NotificationController extends BaseController<
    NotificationControllerConfig,
    NotificationControllerState
> {
    private _notificationLinks: { [notificationId: string]: string } = {}

    constructor(config: NotificationControllerConfig, state?: NotificationControllerState) {
        super(config, state)

        this.initialize()

        window.browser.notifications.onClicked.addListener((notificationId) => {
            const link = this._notificationLinks[notificationId] as string | undefined
            if (link != null) {
                window.open(link, '_blank')
                window.browser.notifications.clear(notificationId).catch(console.error)
            }
            delete this._notificationLinks[notificationId]
        })
    }

    public setHidden(hidden: boolean) {
        this.config.disabled = hidden
    }

    public showNotification({
        title,
        body,
        link,
        eventTime,
        timeout = DEFAULT_NOTIFICATION_TIMEOUT,
    }: INotification) {
        if (this.config.disabled) {
            return
        }

        window.browser.notifications
            .create(undefined, {
                type: 'basic',
                title,
                message: body,
                iconUrl: `${window.browser.runtime.getURL('icon128.png')}`,
                eventTime,
            } as any)
            .then((notificationId) => {
                if (link) {
                    this._notificationLinks[notificationId] = link
                }

                if (timeout > 0) {
                    setTimeout(() => {
                        window.browser.notifications.clear(notificationId).catch(console.error)
                        delete this._notificationLinks[notificationId]
                    }, timeout)
                }
            })
            .catch(console.error)
    }
}
