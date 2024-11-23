export const ICMP_PROTOCOL_NUMBER = 1;
export const TCP_PROTOCOL_NUMBER = 6;
export const UDP_PROTOCOL_NUMBER = 17;

export class EmptyPayload implements IpPayload {
  toBytes() {
    return new Uint8Array(0);
  }
  protocol() {
    return 0xfd;
  }
}

export class IpAddress {
  octets: Uint8Array;

  constructor(octets: Uint8Array) {
    if (octets.length !== 4) {
      throw new Error("Invalid IP address");
    }
    this.octets = octets;
  }

  // Parsear una dirección IP desde un string
  static parse(addrString: string): IpAddress {
    const octets = new Uint8Array(4);
    addrString.split(".").forEach((octet, i) => {
      const octetInt = parseInt(octet);
      if (isNaN(octetInt) || octetInt < 0 || octetInt > 255) {
        throw new Error(`Invalid IP address: ${addrString}`);
      }
      octets[i] = octetInt;
    });
    return new this(octets);
  }

  // Convertir a string (e.g., "192.168.1.1")
  toString(): string {
    return Array.from(this.octets).join(".");
  }

  // Comparar dos direcciones IP
  equals(other: IpAddress): boolean {
    return this.octets.every((octet, index) => octet === other.octets[index]);
  }

  // Aplicar una máscara a la IP (bitwise AND)
  applyMask(mask: IpAddress): IpAddress {
    const maskedOctets = new Uint8Array(
      this.octets.map((octet, i) => octet & mask.octets[i])
    );
    return new IpAddress(maskedOctets);
  }

  // Verificar si la IP pertenece a una red dada (IP base + máscara)
  isInSubnet(baseIp: IpAddress, mask: IpAddress): boolean {
    const maskedThis = this.applyMask(mask);
    const maskedBase = baseIp.applyMask(mask);
    return maskedThis.equals(maskedBase);
  }

  // Validar que la dirección es una IP válida
  static isValid(addrString: string): boolean {
    try {
      this.parse(addrString);
      return true;
    } catch {
      return false;
    }
  }
}

export class IpAddressGenerator {
  private baseIp: number;
  private currentIp: number;
  private mask: string;

  constructor(baseIp: string, mask: string) {
    this.baseIp = IpAddressGenerator.ipToNumber(baseIp);
    this.currentIp = this.baseIp + 1; // Empezar desde la primera IP disponible
    this.mask = mask;
  }

  // Generar la siguiente IP disponible
  getNextIp(): { ip: string; mask: string } {
    const nextIp = IpAddressGenerator.numberToIp(this.currentIp);
    this.currentIp++;
    return { ip: nextIp, mask: this.mask };
  }

  // Convertir IP string a número
  static ipToNumber(ip: string): number {
    return ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
  }

  // Convertir número a IP string
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
  toBytes(): Uint8Array;
  protocol(): number;
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
export class IPv4Packet {
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
    return this.payload.toBytes().length + this.internetHeaderLength * 4;
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
  }) {
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
}

export function computeIpChecksum(octets: Uint8Array): number {
  const sum = octets.reduce((acc, octet, i) => {
    return acc + (octet << (8 * (1 - (i % 2))));
  });
  const checksum = sum & 0xffff;
  const carry = sum >> 16;
  return 0xffff ^ (checksum + carry);
}
