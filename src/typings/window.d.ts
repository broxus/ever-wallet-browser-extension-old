export {}

declare global {
    interface Window {
        ObjectExt: {
            keys<T extends {}>(object: T): (keyof T)[]
        }
    }
}
