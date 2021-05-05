export {}

declare global {
    interface Define extends {} {}

    interface Window {
        ObjectExt: {
            keys<T extends {}>(object: T): (keyof T)[]
            values<T extends {}>(object: T): T[keyof T][]
            entries<T extends {}, K extends keyof T>(object: T): (readonly [K, T[K]])[]
        }

        objectFromEntries<T = any>(
            iterable: Iterable<readonly [PropertyKey, T]>
        ): { [key: string]: T }

        define?: Define
    }
}
