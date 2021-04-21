export {}

declare global {
    interface Window {
        ObjectExt: {
            keys<T extends {}>(object: T): (keyof T)[]
            entries<K extends string, T extends { [K]: infer V }>(object: T): [K, T[K]][]
        }
    }
}
