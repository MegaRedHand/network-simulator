import { ICMP_PROTOCOL_NUMBER, IpPayload, computeIpChecksum } from "./ip";
import { Layer } from "../types/layer";

const ICMP_WARNING =
  "ICMP operates directly on top of IP at the Network layer, bypassing the Transport layer (TCP/UDP). This is because ICMP is primarily used for network diagnostics and error reporting, not for end-to-end data transport.";

export const ICMP_REQUEST_TYPE_NUMBER = 8;
export const ICMP_REPLY_TYPE_NUMBER = 0;

// More info in RFC-792
//   0                   1                   2                   3
//   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//  |     Type      |     Code      |          Checksum             |
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//  |                         variant data                          |
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

  byteLength(): number {
    const headerLength = 8;
    return headerLength + this._dataToBytes().length;
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
    const buffer = Uint8Array.from([this.type, this.code, 0, 0, ...data]);
    return buffer;
  }

  protected abstract _dataToBytes(): Uint8Array;

  getPacketType(): string {
    return `ICMP-${this.type}`;
  }

  abstract getDetails(layer: Layer): Record<string, string | number | object>;
}

//   0                   1                   2                   3
//   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//  |     Type      |     Code      |          Checksum             |
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//  |           Identifier          |        Sequence Number        |
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//  |     Data ...
//  +-+-+-+-+-
class EchoMessage extends IcmpPacket {
  code = 0;

  // Variant data

  // 16 bits
  identifier = 0;

  // 16 bits
  sequenceNumber = 0;

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

  getDetails(layer: number): Record<string, string | number | object> {
    if (layer == Layer.Transport) {
      return {
        Warning: ICMP_WARNING,
      };
    }

    // TODO: If we decide to hide ICMP packets on Application layer, this should be removed
    if (this.type == 8) {
      return {
        Application: "Ping",
        Task: "Echo Request",
      };
    } else {
      return {
        Application: "Ping",
        Task: "Echo Reply",
      };
    }
  }
}

export class EchoRequest extends EchoMessage {
  type = ICMP_REQUEST_TYPE_NUMBER;
}

export class EchoReply extends EchoMessage {
  type = ICMP_REPLY_TYPE_NUMBER;
}
