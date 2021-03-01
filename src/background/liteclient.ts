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

class AdnlClient {
    connection: libnekoton.AdnlConnection;
    socketId: number | null = null;
    responseHandlers: Map<string, () => {}> = new Map<string, () => {}>();

    constructor(connection: libnekoton.AdnlConnection) {
        this.connection = connection;
    }

    public async connect(address: string, port: number) {
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
        await this.send(this.connection.initPacket);
    }

    public async getLatestBlockId() {
        if (this.socketId == null) {
            return;
        }

        const query = this.connection.getMasterchainInfoPacket();
        console.log(query);
        await this.send(query.data);
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

    private async send(data: Uint8Array) {
        await new Promise<void>((resolve, reject) => {
            if (this.socketId == null) {
                return reject(new Error("liteclient was not initialized"));
            }

            chrome.sockets.tcp.send(this.socketId, data, (sendInfo => {
                console.log("Sent:", sendInfo);
                resolve();
            }))
        });
    }

    private onReceive = (args: chrome.sockets.ReceiveEventArgs) => {
        if (args.socketId != this.socketId) {
            return;
        }
        while (true) {
            console.log("Received data:", args.data);
            const processed = this.connection.processReceived(new Uint8Array(args.data));
            console.log(processed);
            if (processed == null) {
                return
            }
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

    await client.getLatestBlockId();

    setTimeout(async () => {
        await client.close();
        console.log("Closed");
    }, 20000);
})();
