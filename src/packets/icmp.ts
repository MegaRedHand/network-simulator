import { ICMP_PROTOCOL_NUMBER, IpPayload, computeIpChecksum } from "./ip";

// More info in RFC-792
//   0                   1                   2                   3
//   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//  |     Type      |     Code      |          Checksum             |
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//  |                             unused                            |
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//  |      Internet Header + 64 bits of Original Data Datagram      |
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
abstract class IcmpPacket implements IpPayload {
    // 8 bits
    type: number;

    // 8 bits
    code: number;

    // 16 bits
    get checksum(): number {
        return computeIpChecksum(this.toBytesWithZeroChecksum());
    }

    protocol(): number {
        return ICMP_PROTOCOL_NUMBER;
    }

    toBytes(): Uint8Array {
        const data = this._dataToBytes();
        const buffer = Uint8Array.from([
            this.type,
            this.code,
            this.checksum >> 8,
            this.checksum & 0xff,
            ...data,
        ]);
        return buffer;
    }

    toBytesWithZeroChecksum(): Uint8Array {
        const data = this._dataToBytes();
        const buffer = Uint8Array.from([
            this.type,
            this.code,
            0,
            0,
            ...data,
        ]);
        return buffer;
    }

    protected abstract _dataToBytes(): Uint8Array;
}

class EchoMessage extends IcmpPacket {
    code = 0;

    // Variant data

    // 16 bits
    identifier: number = 0;

    // 16 bits
    sequenceNumber: number = 0;

    // Variable length
    data: Uint8Array = new Uint8Array(0);

    constructor(sequenceNumber?: number) {
        super();
        if (sequenceNumber !== undefined) {
            this.sequenceNumber = sequenceNumber;
        }
    }

    protected _dataToBytes(): Uint8Array {
        return Uint8Array.from([
            this.identifier >> 8,
            this.identifier & 0xff,
            this.sequenceNumber >> 8,
            this.sequenceNumber & 0xff,
            ...this.data,
        ]);
    }
}

export class EchoReply extends EchoMessage {
    type = 0;
}

export class EchoRequest extends EchoMessage {
    type = 8;
}
