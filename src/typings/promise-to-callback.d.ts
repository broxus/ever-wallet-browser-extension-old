declare module 'promise-to-callback' {
    export default function promiseToCallback<T>(promise: Promise<T>): (callback: T) => void
}
