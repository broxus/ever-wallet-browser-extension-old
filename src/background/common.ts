import * as Base64 from 'base64-js';

export type RequestType = 'connect' | 'send' | 'close';
export type ResponseType = 'connected' | 'received' | 'closed';

export type RequestObject<T extends RequestType> =
    T extends 'connect' ? RequestConnect :
        T extends 'send' ? RequestSend :
            T extends 'close' ? RequestClose :
                never;

export type ResponseObject<T extends ResponseType> =
    T extends 'connected' ? ResponseConnected :
        T extends 'received' ? ResponseReceived :
            T extends 'closed' ? ResponseClosed :
                never;

interface Message<T> {
    readonly type: T;
}

export interface Request extends Message<RequestType> {
}

export interface Response extends Message<ResponseType> {
}

export class RequestConnect implements Request {
    readonly type = 'connect';
    readonly config: Config;

    constructor(config: Config) {
        this.config = config;
    }
}

export class ResponseConnected implements Response {
    readonly type = 'connected';
}

export class RequestSend implements Request {
    readonly type = 'send';
    readonly data: string;

    constructor(data: ArrayBuffer) {
        this.data = packData(data);
    }
}

export class ResponseReceived implements Response {
    readonly type = 'received';
    readonly data: string;

    constructor(data: ArrayBuffer) {
        this.data = packData(data);
    }
}

export class RequestClose implements Request {
    readonly type = 'close';
}

export class ResponseClosed implements Response {
    readonly type = 'closed';
}

export type RawConfig = {
    liteservers: Array<{
        id: {
            '@type': 'pub.ed25519',
            'key': string
        },
        ip: number,
        port: number
    }>,
}

export class Config {
    address!: string;
    port!: number;
    key!: string;

    public static parse(raw: RawConfig): Config {
        if (raw.liteservers.length === 0) {
            throw new Error("No liteservers found");
        }

        const parseIp = (ip: number): string => {
            const a = ip & 0xff;
            const b = ((ip >> 8) & 0xff);
            const c = ((ip >> 16) & 0xff);
            const d = ((ip >> 24) & 0xff);
            return `${d}.${c}.${b}.${a}`;
        }

        const liteserver = raw.liteservers[0];
        return <Config>{
            address: parseIp(liteserver.ip),
            port: liteserver.port,
            key: liteserver.id.key
        };
    };
}

export function packData(data: ArrayBuffer): string {
    return Base64.fromByteArray(new Uint8Array(data));
}

export function unpackData(data: string): ArrayBuffer {
    return Base64.toByteArray(data);
}
