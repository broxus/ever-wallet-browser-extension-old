import { BaseConfig, BaseController, BaseState } from './BaseController'

export interface NotificationControllerConfig extends BaseConfig {}

export interface NotificationControllerState extends BaseState {}

export class NotificationController extends BaseController<
    NotificationControllerConfig,
    NotificationControllerState
> {
    constructor(config: NotificationControllerConfig, state?: NotificationControllerState) {
        super(config, state)

        this.initialize()
    }

    public setHidden(hidden: boolean) {
        this.config.disabled = hidden
    }

    public showNotification(title: string, body: string) {
        if (this.config.disabled) {
            return
        }

        new Notification(title, {
            body,
        })
    }
}
