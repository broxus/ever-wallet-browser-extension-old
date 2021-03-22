import {Config, Request, RequestType, RequestObject, ResponseClosed, ResponseReceived, ResponseConnected, unpackData} from "./common";

chrome.runtime.onConnectExternal.addListener((port) => {
    const client = new Client(port);
    const socket = new Socket(client);

    const dispatch: { [K in RequestType]: (message: RequestObject<K>) => Promise<void>; } = {
        'connect': async (message) => {
            await socket.connect(message.config);
        },
        'send': async (message) => {
            socket.send(unpackData(message.data));
        },
        'close': async (_message) => {
            await socket.close();
        }
    };

    port.onMessage.addListener(async (message: Request,) => {
        const handler = dispatch[message.type];
        if (handler != null) {
            await handler(message as any);
        }
    });

    port.onDisconnect.addListener(async (_port) => {
        await socket.close();
    });
});

class Client {
    private readonly port: chrome.runtime.Port;

    constructor(port: chrome.runtime.Port) {
        this.port = port;
    }

    public notifyConnected() {
        this.port.postMessage(new ResponseConnected());
    }

    public notifyReceived(data: ArrayBuffer) {
        this.port.postMessage(new ResponseReceived(data));
    }

    public notifyClosed() {
        this.port.postMessage(new ResponseClosed());
    }
}

class Socket {
    private readonly client: Client;

    private socketId: number | null = null;

    constructor(client: Client) {
        this.client = client;
    }

    public async connect(config: Config) {
        await this.close();

        const {address, port} = config;

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

        chrome.sockets.tcp.onReceive.addListener(this.onReceive);

        this.client.notifyConnected();
    }

    public send(data: ArrayBuffer) {
        const socketId = this.checkSocketId();
        chrome.sockets.tcp.send(socketId, data, _sendInfo => {
        });
    }

    public async close() {
        await new Promise<void>((resolve,) => {
            if (this.socketId != null) {
                console.log(`Closed socket ${this.socketId}`);
                chrome.sockets.tcp.close(this.socketId, resolve);
                chrome.sockets.tcp.onReceive.removeListener(this.onReceive);
            } else {
                resolve();
            }
        });
        this.client.notifyClosed();
    }

    private onReceive = (args: chrome.sockets.ReceiveEventArgs) => {
        if (args.socketId == this.socketId) {
            this.client.notifyReceived(args.data);
        }
    }

    private checkSocketId(): number {
        if (this.socketId != null) {
            return this.socketId;
        } else {
            throw new Error("Unknown socket id");
        }
    }
}
