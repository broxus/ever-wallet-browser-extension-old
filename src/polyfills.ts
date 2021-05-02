import { Buffer } from 'buffer'
;(window as any).Buffer = Buffer

window.ObjectExt = {
    keys: Object.keys,
    values: Object.values,
    entries: Object.entries,
}

window.objectFromEntries = <T = any>(
    iterable: Iterable<readonly [PropertyKey, T]>
): { [key: string]: T } => {
    return [...iterable].reduce((obj, [key, val]) => {
        ;(obj as any)[key] = val
        return obj
    }, {})
}
