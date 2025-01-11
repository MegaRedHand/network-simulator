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

  // Turn to string
  toString(): string {
    return Array.from(this.octets)
      .map((d) => d.toString(16))
      .join(":");
  }

  // Check if two MAC addresses are equal.
  equals(other: MacAddress): boolean {
    return this.octets.every((octet, index) => octet === other.octets[index]);
  }
}

export class EthernetFrame {
  // Info taken from wikipedia/wireshark wiki
  // 7 bytes preamble and 1 byte start of frame delimiter
  readonly preamble = new Uint8Array([
    0b10101010, 0b10101010, 0b10101010, 0b10101010, 0b10101010, 0b10101010,
    0b10101010, 0b10101011,
  ]);
  // 6 bytes
  destination: MacAddress;
  // 6 bytes
  source: MacAddress;
  // 2 bytes
  length: number;
  // 46-1500 bytes
  userData: Uint8Array;
  // 4 bytes
  fcs: number;
}
