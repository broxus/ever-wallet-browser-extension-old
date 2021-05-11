import { BaseConfig, BaseController, BaseState } from './BaseController'

export interface NotificationControllerConfig extends BaseConfig {}

export interface NotificationControllerState extends BaseState {}

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

    public showNotification(title: string, body: string, link?: string) {
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
            },
            (notificationId) => {
                if (link) {
                    this._notificationLinks[notificationId] = link
                }
            }
        )
    }
}
