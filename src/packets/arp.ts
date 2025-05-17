import { IpAddress } from "./ip";
import { ARP_PROTOCOL_TYPE, FramePayload, MacAddress } from "./ethernet";

const ETHERNET_HTYPE = 1;
const IPv4_PTYPE = 0x0800;
const ETHERNET_HLEN = 6;
const IPv4_PLEN = 4;
export const ARP_REQUEST_CODE = 1;
export const ARP_REPLY_CODE = 2;

// Structure based on RFC 826: https://www.rfc-editor.org/rfc/rfc826.html
export abstract class ArpPacket implements FramePayload {
  // NOTE: We consider the protocol will only use MacAddress and IpAddress

  // 16 bits
  htype: number = ETHERNET_HTYPE;

  // 16 bits
  ptype: number = IPv4_PTYPE;

  // 8 bits
  hlen: number = ETHERNET_HLEN;

  // 8 bits
  plen: number = IPv4_PLEN;

  // Operation code
  // 16 bits
  op: number;

  // Hardware address of sender
  // hlen bits (48 in Ethernet)
  sha: MacAddress;

  // Protocol address of sender
  // plen bits (32 in IPv4)
  spa: IpAddress;

  // Hardware address of target
  // hlen bits (48 in Ethernet)
  tha: MacAddress = MacAddress.broadcastAddress();

  // Protocol address of target
  // plen bits (32 in IPv4)
  tpa: IpAddress;

  constructor(
    op: number,
    sha: MacAddress,
    spa: IpAddress,
    tpa: IpAddress,
    tha?: MacAddress,
  ) {
    this.op = op;
    this.sha = sha;
    this.spa = spa;
    this.tpa = tpa;
    if (tha) {
      this.tha = tha;
    }
  }

  byteLength(): number {
    const headerLength = 8;
    return headerLength;
  }

  toBytes(): Uint8Array {
    const buffer = Uint8Array.from([
      this.htype >> 8,
      this.htype & 0xff,
      this.ptype >> 8,
      this.ptype & 0xff,
      this.hlen,
      this.plen,
      this.op >> 8,
      this.op & 0xff,
      ...this.sha.octets,
      ...this.spa.octets,
      ...this.tha.octets,
      ...this.tpa.octets,
    ]);
    return buffer;
  }

  type(): number {
    return ARP_PROTOCOL_TYPE;
  }

  getPacketType(): string {
    return `ARP-${this.type}`;
  }

  // eslint-disable-next-line
  getDetails(_layer: number): Record<string, string | number | object> {
    return {
      HTYPE: this.htype,
      PTYPE: this.ptype,
      HLEN: this.hlen,
      PLEN: this.plen,
      OP: this.op,
      SHA: this.sha.toString(),
      SPA: this.spa.toString(),
      THA: this.tha.toString(),
      TPA: this.tpa.toString(),
    };
  }
}

export class ArpRequest extends ArpPacket {
  constructor(
    sha: MacAddress,
    spa: IpAddress,
    tpa: IpAddress,
    tha?: MacAddress,
  ) {
    super(ARP_REQUEST_CODE, sha, spa, tpa, tha);
  }
}

export class ArpReply extends ArpPacket {
  constructor(
    sha: MacAddress,
    spa: IpAddress,
    tpa: IpAddress,
    tha?: MacAddress,
  ) {
    super(ARP_REPLY_CODE, sha, spa, tpa, tha);
  }
}
