declare module '@ledgerhq/hw-transport-webhid' {
    import Transport from "@ledgerhq/hw-transport";
    import type {
        Observer,
        DescriptorEvent,
        Subscription,
    } from "@ledgerhq/hw-transport";

    declare type HIDDeviceFilter = {
        vendorId?: number,
        productId?: number,
        usagePage?: number,
        usage?: number
    };

    declare type HIDDeviceRequestOptions = {
        filters: HIDDeviceFilter[]
    };

    declare class HIDConnectionEvent extends Event {
        device: HIDDevice;
    }

    declare type HIDConnectionEventHandler = (event: HIDConnectionEvent) => mixed;

    declare class HID extends EventTarget {
        getDevices(): Promise<HIDDevice[]>;
        requestDevice(options: HIDDeviceRequestOptions): Promise<HIDDevice>;
        addEventListener(eventName: "connect", HIDConnectionEventHandler): void;
        removeEventListener(eventName: "connect", HIDConnectionEventHandler): void;
        addEventListener(eventName: "disconnect", HIDConnectionEventHandler): void;
        removeEventListener(eventName: "disconnect", HIDConnectionEventHandler): void;
    }

    declare class InputReportEvent extends Event {
        data: DataView;
        device: HIDDevice;
        reportId: number;
    }

    declare type InputReportEventHandler = (event: InputReportEvent) => mixed;

    declare class HIDDevice {
        oninputreport: InputReportEventHandler;
        opened: boolean;
        vendorId: number;
        productId: number;
        productName: string;
        open(): Promise<void>;
        close(): Promise<void>;
        sendReport(reportId: number, data: BufferSource): Promise<void>;
        sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
        receiveFeatureReport(reportId: number): Promise<DataView>;
        addEventListener(eventName: "inputreport", InputReportEventHandler): void;
        removeEventListener(eventName: "inputreport", InputReportEventHandler): void;
    }

    declare class TransportWebHID extends Transport<HIDDevice> {
        constructor(device: HIDDevice)
        read(): Promise<Buffer>
        onInputReport(InputReportEvent): void

        static isSupported(): Promise<boolean>
        static list(): Promise<HIDDevice[]>
        static listen(): Observer<DescriptorEvent<HIDDevice>>
        static request(): Promise<string | RTCDtlsTransport | null | RTCIceTransport>
        static openConnected(): Promise<string | RTCDtlsTransport | null | RTCIceTransport>
        static open(device: HIDDevice): Promise<TransportWebHID>

        close(): Promise<void>
        exchange(apdu: Buffer): Promise<Buffer>
    }

    export default TransportWebHID
}
