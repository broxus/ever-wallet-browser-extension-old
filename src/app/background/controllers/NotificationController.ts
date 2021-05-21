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

        chrome.notifications.onClicked.addListener((notificationId) => {
            const link = this._notificationLinks[notificationId] as string | undefined
            if (link != null) {
                window.open(link, '_blank')
                chrome.notifications.clear(notificationId)
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

        chrome.notifications.create(
            {
                type: 'basic',
                title,
                message: body,
                iconUrl: `${chrome.extension.getURL('icon128.png')}`,
                requireInteraction: true,
                eventTime,
            },
            (notificationId) => {
                if (link) {
                    this._notificationLinks[notificationId] = link
                }

                if (timeout > 0) {
                    setTimeout(() => {
                        chrome.notifications.clear(notificationId)
                        delete this._notificationLinks[notificationId]
                    }, timeout)
                }
            }
        )
    }
}
