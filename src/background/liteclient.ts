import libnekoton, {AccountId, AdnlConnection, LastBlockIdExt, TransactionId} from "../../nekoton/pkg";

const CONFIG_URL: string = 'https://freeton.broxus.com/mainnet.config.json';

(async () => {
    const nekoton = await libnekoton;

    const config: Config = await fetch(CONFIG_URL).then(data => data.json()).then(Config.parse);
    console.log("Config loaded:", config);

    const client = new AdnlClient(nekoton.AdnlConnection.fromKey(config.key));
    await client.connect(config.address, config.port);

    console.log("Initialized");

    const latestBlockId = await client.getLatestBlockId();
    console.log(latestBlockId);

    const accountId = nekoton.AccountId.parse('0:a921453472366b7feeec15323a96b5dcf17197c88dc0d4578dfa52900b8a33cb');

    const accountState = await client.getAccountState(latestBlockId, accountId);
    console.log("Got account state for", accountId.toString(), accountState);

    let lastTransactionId = accountState.lastTransactionId;
    while (lastTransactionId != null) {
        const transactions = await client.getTransactions(accountId, lastTransactionId, 16);

        lastTransactionId = undefined;
        transactions.forEach(transaction => {
            lastTransactionId = transaction.previousTransactionId;
            console.log(transaction.id.toString(), transaction.now);
        });
    }

    setTimeout(async () => {
        await client.close();
        console.log("Closed");
    }, 20000);
})();

interface Query<T> {
    readonly data: Uint8Array,

    onResponse(connection: AdnlConnection, data: Uint8Array): T | undefined;
}

class AdnlClient {
    connection: libnekoton.AdnlConnection;
    socketId: number | null = null;
    channelMutex: Mutex = new Mutex();
    responseHandler: ((data: ArrayBuffer) => void) | null = null;

    constructor(connection: AdnlConnection) {
        this.connection = connection;
    }

    public async getLatestBlockId() {
        return await this.query(this.connection.getMasterchainInfo());
    }

    public async getAccountState(latestBlockId: LastBlockIdExt, address: AccountId) {
        return await this.query(this.connection.getAccountState(latestBlockId, address));
    }

    public async getTransactions(address: AccountId, from: TransactionId, count: number) {
        return await this.query(this.connection.getTransactions(address, from, count));
    }

    public async sendMessage(data: Uint8Array) {
        return await this.query(this.connection.sendMessage(data));
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
        await this.query(<Query<true>>{
            data: this.connection.initPacket,
            onResponse: (connection, data) => {
                connection.handleInitPacket(data);
                return true;
            },
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

    private async query<T>(query: Query<T>): Promise<T> {
        const unlock = await this.channelMutex.lock();

        return await new Promise<T>((resolve, reject) => {
            if (this.socketId == null) {
                return reject(new Error("liteclient was not initialized"));
            }

            this.responseHandler = (data) => {
                const result = query.onResponse(this.connection, new Uint8Array(data));
                if (result != null) {
                    this.responseHandler = null;
                    unlock();
                    resolve(result);
                }
            };

            chrome.sockets.tcp.send(this.socketId, query.data, _sendInfo => {
            })
        });
    }

    private onReceive = (args: chrome.sockets.ReceiveEventArgs) => {
        if (args.socketId != this.socketId) {
            return;
        }

        if (this.responseHandler != null) {
            this.responseHandler(args.data);
        }
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
