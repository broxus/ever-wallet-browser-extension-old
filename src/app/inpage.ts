let __define: Define | undefined

const cleanContextForImports = () => {
    __define = window.define
    try {
        window.define = undefined
    } catch (_) {
        console.warn('Nekoton: global.define could not be deleted')
    }
}

const restoreContextAfterImports = () => {
    try {
        window.define = __define
    } catch (_) {
        console.warn('Nekoton: global.define could not be overwritten')
    }
}

cleanContextForImports()

import '../polyfills'
import LocalMessageDuplexStream from 'post-message-stream'
import { initializeProvider } from './provider'
import { CONTENT_SCRIPT, INPAGE_SCRIPT } from '../shared/constants'

restoreContextAfterImports()

const nekotonStream = new LocalMessageDuplexStream({
    name: INPAGE_SCRIPT,
    target: CONTENT_SCRIPT,
})

initializeProvider({
    connectionStream: nekotonStream,
})
