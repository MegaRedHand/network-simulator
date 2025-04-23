import { FramePayload, IP_PROTOCOL_TYPE } from "./ethernet";
import { Layer } from "../types/layer";

// Taken from here: https://en.wikipedia.org/wiki/List_of_IP_protocol_numbers
export const ICMP_PROTOCOL_NUMBER = 1;
export const TCP_PROTOCOL_NUMBER = 6;
export const UDP_PROTOCOL_NUMBER = 17;

export class EmptyPayload implements IpPayload {
  byteLength() {
    return 0;
  }
  toBytes() {
    return new Uint8Array(0);
  }
  protocol() {
    // This number is reserved for experimental protocols
    return 0xfd;
  }
  getPacketType(): string {
    return "EMPTY-PROTOCOL";
  }

  getDetails() {
    return {};
  }
}

/// Internet Protocol (IP) address
// TODO: support IPv6?
export class IpAddress {
  // 4 bytes
  octets: Uint8Array;

  constructor(octets: Uint8Array) {
    if (octets.length !== 4) {
      throw new Error("Invalid IP address");
    }
    this.octets = octets;
  }

  // Parse IP address from a string representation (10.25.34.42)
  static parse(addrString: string): IpAddress | null {
    const octets = new Uint8Array(4);
    const splits = addrString.split(".");
    if (splits.length !== 4) {
      console.error("Invalid IP address. Length: ", splits.length);
      return null;
    }
    splits.forEach((octet, i) => {
      const octetInt = parseInt(octet);
      if (isNaN(octetInt) || octetInt < 0 || octetInt > 255) {
        console.error("Invalid IP address. value: ", octetInt);
        return null;
      }
      octets[i] = octetInt;
    });
    return new this(octets);
  }

  // Turn to string
  toString(): string {
    return Array.from(this.octets).join(".");
  }

  // Check if two IP addresses are equal.
  equals(other: IpAddress): boolean {
    return this.octets.every((octet, index) => octet === other.octets[index]);
  }

  // Apply a bitmask to the address (bitwise AND) and return the result.
  applyMask(mask: IpAddress): IpAddress {
    const maskedOctets = new Uint8Array(
      this.octets.map((octet, i) => octet & mask.octets[i]),
    );
    return new IpAddress(maskedOctets);
  }

  // Return true if the two IP addresses are in the same subnet specified by the mask.
  isInSubnet(baseIp: IpAddress, mask: IpAddress): boolean {
    const maskedThis = this.applyMask(mask);
    const maskedBase = baseIp.applyMask(mask);
    return maskedThis.equals(maskedBase);
  }
}

export class IpAddressGenerator {
  private baseIp: number;
  private currentIp: number;
  private mask: string;

  constructor(baseIp: string, mask: string) {
    this.baseIp = IpAddressGenerator.ipToNumber(baseIp);
    this.currentIp = this.baseIp + 1; // Start on first valid IP
    this.mask = mask;
  }

  // Generate next valid IP
  getNextIp(): { ip: string; mask: string } {
    const nextIp = IpAddressGenerator.numberToIp(this.currentIp);
    this.currentIp++;
    return { ip: nextIp, mask: this.mask };
  }

  // Turn IP into a number
  static ipToNumber(ip: string): number {
    return ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
  }

  // Turn number into IP
  static numberToIp(num: number): string {
    return [
      (num >> 24) & 0xff,
      (num >> 16) & 0xff,
      (num >> 8) & 0xff,
      num & 0xff,
    ].join(".");
  }
}

export interface IpPayload {
  // Length of the payload in bytes
  byteLength(): number;
  // The bytes equivalent of the payload
  toBytes(): Uint8Array;
  // The number of the protocol
  protocol(): number;
  // Packet protocol name
  getPacketType(): string;
  // Get details of the payload
  getDetails?(layer: Layer): Record<string, string | number | object>;
}

// Info taken from the original RFC: https://datatracker.ietf.org/doc/html/rfc791#section-3.1
//   0                   1                   2                   3
//   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//  |Version|  IHL  |Type of Service|          Total Length         |
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//  |         Identification        |Flags|      Fragment Offset    |
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//  |  Time to Live |    Protocol   |         Header Checksum       |
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//  |                       Source Address                          |
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//  |                    Destination Address                        |
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
//  |                    Options                    |    Padding    |
//  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
export class IPv4Packet implements FramePayload {
  // IP version field
  // 4 bits
  readonly version = 4;

  // Length of the header in 32-bit words.
  // Has a minimum of 5
  // 4 bits
  // This is always 5 here because we don't have options
  readonly internetHeaderLength = 5;

  // Indication of the abstract parameters of the quality of service desired
  // 8 bits
  typeOfService = 0;

  // Length of the datagram, in bytes
  // 16 bits
  get totalLength() {
    const headerSize = this.internetHeaderLength * 4;
    return headerSize + this.payload.byteLength();
  }

  // Identifying value assigned by the sender
  // Used only for fragmentation and reassembly (see RFC-6864)
  // 16 bits
  identification = 0;

  // Various Control Flags
  // 3 bits
  flags = 0;

  // Indicates where in the datagram this fragment belongs.
  // Measured in units of 8 octets (8 bytes)
  // 13 bits
  fragmentOffset = 0;

  // Maximum number of hops
  // 8 bits
  timeToLive = 255;

  // Transport layer protocol identifier
  // 8 bits
  protocol: number;

  // 16 bits
  // TODO: compute
  get headerChecksum() {
    return this.computeChecksum();
  }

  // 32 bits
  sourceAddress: IpAddress;

  // 32 bits
  destinationAddress: IpAddress;

  // TODO: add options

  payload: IpPayload;

  constructor(source: IpAddress, destination: IpAddress, payload: IpPayload) {
    this.sourceAddress = source;
    this.destinationAddress = destination;
    this.protocol = payload.protocol();
    this.payload = payload;
  }

  toBytes({
    withChecksum = true,
    withPayload = true,
  }: {
    withChecksum?: boolean;
    withPayload?: boolean;
  } = {}) {
    let checksum = 0;
    if (withChecksum) {
      checksum = this.headerChecksum;
    }
    let payload = new Uint8Array(0);
    if (withPayload) {
      payload = this.payload.toBytes();
    }
    return Uint8Array.from([
      (this.version << 4) | this.internetHeaderLength,
      this.typeOfService,
      this.totalLength >> 8,
      this.totalLength & 0xff,
      this.identification >> 8,
      this.identification & 0xff,
      (this.flags << 5) | (this.fragmentOffset >> 8),
      this.fragmentOffset & 0xff,
      this.timeToLive,
      this.protocol,
      checksum >> 8,
      checksum & 0xff,
      ...this.sourceAddress.octets,
      ...this.destinationAddress.octets,
      ...payload,
    ]);
  }

  computeChecksum(): number {
    const octets = this.toBytes({ withChecksum: false, withPayload: false });
    return computeIpChecksum(octets);
  }

  /// Returns true if the checksum is valid
  validateChecksum(): boolean {
    const octets = this.toBytes({ withPayload: false });
    const result = computeIpChecksum(octets);
    return result === 0;
  }

  type(): number {
    return IP_PROTOCOL_TYPE;
  }

  getDetails(layer: Layer) {
    if (layer == Layer.Network) {
      return {
        Version: this.version,
        "Internet Header Length": this.internetHeaderLength,
        "Type of Service": this.typeOfService,
        "Total Length": this.totalLength,
        Identification: this.identification,
        "Fragment Offset": this.fragmentOffset,
        "Time to Live": this.timeToLive,
        Protocol: this.protocol,
        "Header Checksum": this.headerChecksum,
        Payload: this.payload,
      };
    } else {
      return this.payload.getDetails(layer);
    }
  }
}

export function computeIpChecksum(octets: Uint8Array): number {
  const sum = octets.reduce((acc, octet, i) => {
    return acc + (octet << (8 * (1 - (i % 2))));
  }, 0);
  const checksum = sum & 0xffff;
  const carry = sum >> 16;
  return 0xffff ^ (checksum + carry);
}

export function compareIps(ip1: IpAddress, ip2: IpAddress): number {
  for (let i = 0; i < 4; i++) {
    if (ip1.octets[i] < ip2.octets[i]) return -1;
    if (ip1.octets[i] > ip2.octets[i]) return 1;
  }
  return 0; // equal
}
