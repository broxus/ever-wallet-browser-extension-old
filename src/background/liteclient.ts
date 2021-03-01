import libnekoton from "../../nekoton/pkg";

const CONFIG_URL: string = 'https://freeton.broxus.com/mainnet.config.json';

type RawConfig = {
    liteservers: Array<{
        id: {
            '@type': 'pub.ed25519',
            'key': string
        },
        ip: number,
        port: number
    }>,
}

type Config = {
    address: string,
    port: number,
    key: string
}

const parseConfig = (config: RawConfig): Config => {
    if (config.liteservers.length === 0) {
        throw new Error("No liteservers found");
    }

    const parseIp = (ip: number): string => {
        const a = ip & 0xff;
        const b = ((ip >> 8) & 0xff);
        const c = ((ip >> 16) & 0xff);
        const d = ((ip >> 24) & 0xff);
        return `${d}.${c}.${b}.${a}`;
    }

    const liteserver = config.liteservers[0];
    return <Config>{
        address: parseIp(liteserver.ip),
        port: liteserver.port,
        key: liteserver.id.key
    };
};

class Mutex {
    current: Promise<void> = Promise.resolve();

    public lock = () => {
        let resolveChanged: () => void;
        const chained = new Promise<void>((resolve,) => {
            resolveChanged = () => resolve();
        });

        const result = this.current.then(() => resolveChanged);
        this.current = chained;

        return result;
    };
}

class AdnlClient {
    connection: libnekoton.AdnlConnection;
    socketId: number | null = null;
    channelMutex: Mutex = new Mutex();
    responseHandler: ((data: ArrayBuffer) => void) | null = null;

    constructor(connection: libnekoton.AdnlConnection) {
        this.connection = connection;
    }

    public async connect(address: string, port: number) {
        await this.close();

        const createSocket = new Promise<number>((resolve,) => {
            chrome.sockets.tcp.create({}, (createInfo => {
                resolve(createInfo.socketId);
            }));
        });
        const socketId = await createSocket;
        this.socketId = socketId;

        const connection = new Promise((resolve, reject) => {
            console.log(`Connecting to ${address}:${port} from socket ${socketId}`);
            chrome.sockets.tcp.connect(socketId, address, port, (result) => {
                if (result >= 0) {
                    resolve(result);
                } else {
                    reject(result);
                }
            });
        });
        const result = await connection;
        console.log(`Connected to ${address}:${port} with result ${result}`);

        chrome.sockets.tcp.onReceive.addListener(this.onReceive);
        await this.send(this.connection.initPacket, () => {
        });
    }

    public async getLatestBlockId() {
        if (this.socketId == null) {
            return;
        }

        const query = this.connection.getMasterchainInfo();
        console.log(query);
        return await this.send(query.data, response => {
            return query.handleResult(this.connection, new Uint8Array(response));
        });
    }

    public async close() {
        await new Promise<void>((resolve,) => {
            if (this.socketId != null) {
                chrome.sockets.tcp.close(this.socketId, resolve);
                chrome.sockets.tcp.onReceive.removeListener(this.onReceive);
            } else {
                resolve();
            }
        });
    }

    private async send<T>(data: Uint8Array, onResponse: (data: ArrayBuffer) => T): Promise<T> {
        const unlock = await this.channelMutex.lock();

        return await new Promise<T>((resolve, reject) => {
            if (this.socketId == null) {
                return reject(new Error("liteclient was not initialized"));
            }

            this.responseHandler = (data) => {
                const result = onResponse(data);
                this.responseHandler = null;
                unlock();
                resolve(result);
            };

            chrome.sockets.tcp.send(this.socketId, data, (sendInfo => {
                console.log("Sent:", sendInfo);
            }))
        });
    }

    private onReceive = (args: chrome.sockets.ReceiveEventArgs) => {
        if (args.socketId != this.socketId) {
            return;
        }

        console.log("Received data:", args.data);
        if (this.responseHandler != null) {
            this.responseHandler(args.data);
        }
    }
}

(async () => {
    const nekoton = await libnekoton;
    const config: Config = await fetch(CONFIG_URL).then(data => data.json()).then(parseConfig);
    console.log("Loaded config:", config);

    const client = new AdnlClient(nekoton.AdnlConnection.fromKey(config.key));
    await client.connect(config.address, config.port);

    console.log("Working...");

    const latestBlockId = await client.getLatestBlockId();
    console.log(latestBlockId);

    setTimeout(async () => {
        await client.close();
        console.log("Closed");
    }, 20000);
})();
