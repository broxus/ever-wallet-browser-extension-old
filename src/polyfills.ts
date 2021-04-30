import { Buffer } from 'buffer'
;(window as any).Buffer = Buffer

window.ObjectExt = {
    keys: Object.keys,
    values: Object.values,
    entries: Object.entries,
}
