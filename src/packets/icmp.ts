import {
  ICMP_PROTOCOL_NUMBER,
  IPv4Packet,
  IpPayload,
  computeIpChecksum,
} from "./ip";
import { Layer } from "../types/devices/layer";

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
    const buffer = Uint8Array.from([this.type, this.code, 0, 0, ...data]);
    return buffer;
  }

  protected abstract _dataToBytes(): Uint8Array;

  getPacketType(): string {
    return `ICMP-${this.type}`;
  }
}

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

  getPacketDetails(
    layer: number,
    rawPacket: IPv4Packet,
  ): Record<string, string | number | object> {
    if (layer == Layer.App) {
      return {
        Application: "Echo Server",
        Task: this.type == 8 ? "Echo Request" : "Echo Reply",
      };
    }
    if (layer == Layer.Transport) {
      return {
        Warning:
          "ICMP operates directly on top of IP at the Network layer, bypassing the Transport layer (TCP/UDP). This is because ICMP is primarily used for network diagnostics and error reporting, not for end-to-end data transport.",
      };
    }
    if (layer == Layer.Network) {
      return {
        Version: rawPacket.version,
        "Internet Header Length": rawPacket.internetHeaderLength,
        "Type of Service": rawPacket.typeOfService,
        "Total Length": rawPacket.totalLength,
        Identification: rawPacket.identification,
        Flags: rawPacket.flags,
        "Fragment Offset": rawPacket.fragmentOffset,
        "Time to Live": rawPacket.timeToLive,
        Protocol: rawPacket.protocol,
        "Header Checksum": rawPacket.headerChecksum,
        Payload: {
          type: this.type == 8 ? "EchoRequest" : "EchoReply",
          Identifier: this.identifier,
          "Sequence Number": this.sequenceNumber,
          Data: Array.from(this.data),
        },
      };
    }
    if (layer == Layer.Link) {
      return {
        "Ethernet Header": "---",
        "Destination MAC": "---",
        "Source MAC": "---",
        "Ether Type": "0x0800",
      };
    }
  }
}

export class EchoRequest extends EchoMessage {
  type = 8;
}

export class EchoReply extends EchoMessage {
  type = 0;
}
