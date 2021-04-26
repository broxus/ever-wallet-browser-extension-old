declare module 'obj-multiplex' {
    import { Duplex } from 'readable-stream'

    type DuplexParams = { parent: string; name: string }

    declare class Substream extends Duplex {
        constructor(params: DuplexParams)
    }

    declare class ObjectMultiplex extends Duplex {
        createStream(name: string): Substream

        ignoreStream(name: string)
    }

    export default ObjectMultiplex
}
