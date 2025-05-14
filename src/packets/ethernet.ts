import { CRC32 } from "@tsxper/crc32";
import { Layer } from "../types/layer";

// From https://en.wikipedia.org/wiki/EtherType
export const IP_PROTOCOL_TYPE = 0x0800;
export const ARP_PROTOCOL_TYPE = 0x0806;
export const IPV6_PROTOCOL_TYPE = 0x86dd;
const BROADCAST_ADDRESS = "ff:ff:ff:ff:ff:ff";

/// Medium Access Control (MAC) address
export class MacAddress {
  // 6 bytes
  octets: Uint8Array;

  constructor(octets: Uint8Array) {
    if (octets.length !== 6) {
      throw new Error("Invalid MAC address");
    }
    this.octets = octets;
  }

  // Parse MAC address from a string representation (00:1b:63:84:45:e6)
  static parse(addrString: string): MacAddress {
    const octets = new Uint8Array(6);
    addrString.split(":").forEach((octet, i) => {
      const octetInt = parseInt(octet, 16);
      if (isNaN(octetInt) || octetInt < 0 || octetInt > 255) {
        throw new Error(`Invalid MAC address: ${addrString}`);
      }
      octets[i] = octetInt;
    });
    return new this(octets);
  }

  // Create a broadcast MAC address instance
  static broadcastAddress(): MacAddress {
    return MacAddress.parse(BROADCAST_ADDRESS);
  }

  isBroadcast(): boolean {
    return this.octets.every((octet) => octet == 0xff);
  }

  // Turn to string
  toString(): string {
    return Array.from(this.octets)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(":");
  }

  toCompressedString(): string {
    return Array.from(this.octets)
      .map((byte) => (byte === 0 ? "" : byte.toString(16).padStart(2, "0")))
      .join(":");
  }

  // Check if two MAC addresses are equal.
  equals(other: MacAddress): boolean {
    return this.octets.every((octet, index) => octet === other.octets[index]);
  }
}

export class MacAddressGenerator {
  private baseMac: bigint;
  private currentMac: bigint;

  constructor(baseMac: string) {
    this.baseMac = MacAddressGenerator.macToNumber(baseMac);
    this.currentMac = this.baseMac + BigInt(1); // Start on first valid MAC
  }

  // Generate next valid IP
  getNextMac(): string {
    const nextMac = MacAddressGenerator.numberToMac(this.currentMac);
    this.currentMac++;
    return nextMac;
  }

  // Turn MAC into a number
  static macToNumber(mac: string): bigint {
    // leaves an hexadecimal string of 6 bytes, then parse it to bigint
    return BigInt("0x" + mac.replace(/:/g, ""));
  }

  // Turn number into IP
  static numberToMac(num: bigint): string {
    const match = num.toString(16).padStart(12, "0").match(/.{2}/g);
    return match ? match.join(":") : "";
  }
}

const crc32 = new CRC32();

const MINIMUM_PAYLOAD_SIZE = 46;

export class EthernetFrame {
  // Info taken from Computer Networking: A Top-Down Approach

  // 8 bytes
  // 7 bytes preamble and 1 byte start of frame delimiter
  // Used to synchronize the communication
  // TODO: should we mention this somewhere?
  // readonly preamble = new Uint8Array([
  //   0b10101010, 0b10101010, 0b10101010, 0b10101010, 0b10101010, 0b10101010,
  //   0b10101010, 0b10101011,
  // ]);

  // 6 bytes
  // Destination MAC address
  destination: MacAddress;
  // 6 bytes
  // Source MAC address
  source: MacAddress;
  // 2 bytes
  // The payload's type
  type: number;
  // 46-1500 bytes
  // If the payload is smaller than 46 bytes, it is padded.
  // TODO: make this an interface
  // The payload
  payload: FramePayload;
  // 4 bytes
  // Cyclic Redundancy Check (CRC)
  get crc(): number {
    // Computation doesn't include preamble
    const frameBytes = this.toBytes({
      withChecksum: false,
    });
    return crc32.forBytes(frameBytes);
  }

  constructor(
    source: MacAddress,
    destination: MacAddress,
    payload: FramePayload,
  ) {
    this.destination = destination;
    this.source = source;
    this.type = payload.type();
    this.payload = payload;
  }

  toBytes({ withChecksum = true }: { withChecksum?: boolean } = {}) {
    let checksum: number[] = [];
    if (withChecksum) {
      const crc = this.crc;
      checksum = [crc & 0xff, (crc >> 8) & 0xff, (crc >> 16) & 0xff, crc >> 24];
    }
    let payload = this.payload.toBytes();
    if (payload.length < MINIMUM_PAYLOAD_SIZE) {
      const padding = new Array(MINIMUM_PAYLOAD_SIZE - payload.length);
      payload = Uint8Array.from([...payload, ...padding]);
    }
    return Uint8Array.from([
      ...this.destination.octets,
      ...this.source.octets,
      this.type >> 8,
      this.type & 0xff,
      ...payload,
      ...checksum,
    ]);
  }

  getDetails(layer: Layer) {
    if (layer == Layer.Link) {
      const ethernetDetails = {
        EtherType: this.type.toString(),
      };
      // Merge Ethernet details with payload details
      return {
        ...ethernetDetails,
        ...this.payload.getDetails(layer),
      };
    } else {
      return this.payload.getDetails(layer);
    }
  }
}

export interface FramePayload {
  // The bytes equivalent of the payload
  toBytes(): Uint8Array;
  // The number of the protocol
  type(): number;
  // Get details of the payload
  getDetails(layer: Layer): Record<string, string | number | object>;
}

export function compareMacs(mac1: MacAddress, mac2: MacAddress): number {
  for (let i = 0; i < 6; i++) {
    if (mac1.octets[i] < mac2.octets[i]) return -1;
    if (mac1.octets[i] > mac2.octets[i]) return 1;
  }
  return 0; // equal
}
