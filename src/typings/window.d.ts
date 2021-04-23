export {}

declare global {
    import { NotificationManager } from '../app/background/notificationManager'

    interface Define extends {} {}

    interface Window {
        ObjectExt: {
            keys<T extends {}>(object: T): (keyof T)[]
            entries<K extends string, T extends { [K]: infer V }>(object: T): [K, T[K]][]
        }

        define?: Define
        NEKOTON_NOTIFIER: NotificationManager
    }
}
