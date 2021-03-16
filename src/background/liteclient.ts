import init, {AdnlConnection, TcpReceiver, TonInterface} from "../../nekoton/pkg";

const CONFIG_URL: string = 'https://freeton.broxus.com/mainnet.config.json';

(async () => {
    await init('index_bg.wasm');

    const config: Config = await fetch(CONFIG_URL).then(data => data.json()).then(Config.parse);
    console.log("Config loaded:", config);

    const socket = new Socket();
    const connection = await socket.connect(config);

    const core = new TonInterface(connection);
    console.log(await core.getLatestMasterchainBlock());
})();

class Socket {
    socketId: number | null = null;
    receiver: TcpReceiver | null = null;

    public async connect(config: Config): Promise<AdnlConnection> {
        await this.close();

        const { address, port, key } = config;

        const socketId = await new Promise<number>((resolve,) => {
            chrome.sockets.tcp.create({}, (createInfo => {
                resolve(createInfo.socketId);
            }));
        });
        this.socketId = socketId;

        const result = await new Promise((resolve, reject) => {
            console.log(`Connecting to ${address}:${port} from socket ${socketId}`);
            chrome.sockets.tcp.connect(socketId, address, port, (result) => {
                if (result >= 0) {
                    resolve(result);
                } else {
                    reject(result);
                }
            });
        });
        console.log(`Connected to ${address}:${port} with result ${result}`);

        const connection = new AdnlConnection(new TcpSender((data) => {
            if (this.socketId == null) {
                throw Error("Unknown socket id");
            }
            chrome.sockets.tcp.send(this.socketId, data, _sendInfo => {
            });
        }));

        let initData!: ArrayBuffer;
        let resolveInitialization!: (data: ArrayBuffer) => void;
        const initialized = new Promise<void>((resolve,) => {
            resolveInitialization = (data) => {
                initData = data;
                resolve();
            }
        });

        const onReceiveInit = (args: chrome.sockets.ReceiveEventArgs) => {
            if (args.socketId != this.socketId) {
                throw new Error("Unknown socket id");
            }
            resolveInitialization(args.data);
        };

        chrome.sockets.tcp.onReceive.addListener(onReceiveInit);

        this.receiver = connection.init(key);
        await initialized;

        this.receiver.onReceive(new Uint8Array(initData));

        chrome.sockets.tcp.onReceive.removeListener(onReceiveInit);
        chrome.sockets.tcp.onReceive.addListener(this.onReceive);

        return connection;
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

    private onReceive = (args: chrome.sockets.ReceiveEventArgs) => {
        if (args.socketId != this.socketId || this.receiver == null) {
            return;
        }
        this.receiver.onReceive(new Uint8Array(args.data));
    }
}

class TcpSender {
    constructor(private f: (data: Uint8Array) => void) {
    }

    send(data: Uint8Array) {
        this.f(data);
    }
}

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

class Config {
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
