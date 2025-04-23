import {
  computeIpChecksum,
  IpAddress,
  IpPayload,
  TCP_PROTOCOL_NUMBER,
} from "./ip";
import { Layer } from "../types/layer";

export class Flags {
  // Urgent Pointer field significant
  public urg = false;
  // Acknowledgment field significant
  public ack = false;
  // Push function
  public psh = false;
  // Reset the connection
  public rst = false;
  // Synchronize sequence numbers
  public syn = false;
  // No more data from sender
  public fin = false;

  // 6 bits
  toByte(): number {
    return [this.urg, this.ack, this.psh, this.rst, this.syn, this.fin].reduce(
      (acc, flag, index) => {
        return acc | bitSet(flag, 5 - index);
      },
      0,
    );
  }

  withUrg(urg = true): Flags {
    this.urg = urg;
    return this;
  }

  withAck(ack = true): Flags {
    this.ack = ack;
    return this;
  }

  withPsh(psh = true): Flags {
    this.psh = psh;
    return this;
  }

  withRst(rst = true): Flags {
    this.rst = rst;
    return this;
  }

  withSyn(syn = true): Flags {
    this.syn = syn;
    return this;
  }

  withFin(fin = true): Flags {
    this.fin = fin;
    return this;
  }
}

function bitSet(value: boolean, bit: number): number {
  return value ? 1 << bit : 0;
}

export class TcpSegment implements IpPayload {
  // Info taken from the original RFC: https://www.ietf.org/rfc/rfc793.txt
  //  0                   1                   2                   3
  //  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
  // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  // |          Source Port          |       Destination Port        |
  // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  // |                        Sequence Number                        |
  // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  // |                    Acknowledgment Number                      |
  // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  // |  Data |           |U|A|P|R|S|F|                               |
  // | Offset| Reserved  |R|C|S|S|Y|I|            Window             |
  // |       |           |G|K|H|T|N|N|                               |
  // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  // |           Checksum            |         Urgent Pointer        |
  // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  // |                    Options                    |    Padding    |
  // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  // |                             data                              |
  // +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
  //
  // 2 bytes
  // The source port number.
  sourcePort: number;
  // 2 bytes
  // The destination port number.
  destinationPort: number;
  // 4 bytes
  // The sequence number of the first data octet in this segment (except
  // when SYN is present). If SYN is present the sequence number is the
  // initial sequence number (ISN) and the first data octet is ISN+1.
  sequenceNumber: number;
  // 4 bytes
  // If the ACK control bit is set this field contains the value of the
  // next sequence number the sender of the segment is expecting to
  // receive. Once a connection is established this is always sent.
  acknowledgementNumber: number;

  // 4 bits
  // 4-byte offset from the start of the TCP segment to the start of the data
  readonly dataOffset: number = 5;

  // 6 bits
  // Reserved for future use.  Must be zero.
  readonly reserved: number = 0;

  // Control bits
  // 6 bits
  flags: Flags;

  // 2 bytes
  // The number of data octets beginning with the one indicated in the
  // acknowledgment field which the sender of this segment is willing to
  // accept.
  public window = 0xffff;

  // 2 bytes
  get checksum(): number {
    return this.computeChecksum();
  }

  // 2 bytes
  readonly urgentPointer = 0;

  // 0-40 bytes
  // TODO: implement options
  // options: Option[];

  // Variable size
  data: Uint8Array;

  // Used for the checksum calculation
  srcIpAddress: IpAddress;
  dstIpAddress: IpAddress;

  constructor(
    srcPort: number,
    dstPort: number,
    seqNum: number,
    ackNum: number,
    flags: Flags,
    data: Uint8Array,
  ) {
    checkUint(srcPort, 16);
    checkUint(dstPort, 16);
    checkUint(seqNum, 32);
    checkUint(ackNum, 32);

    this.sourcePort = srcPort;
    this.destinationPort = dstPort;
    this.sequenceNumber = seqNum;
    this.acknowledgementNumber = ackNum;
    this.flags = flags;
    this.data = data;
  }

  computeChecksum(): number {
    const segmentBytes = this.toBytes({ withChecksum: false });

    const pseudoHeaderBytes = Uint8Array.from([
      ...this.srcIpAddress.octets,
      ...this.dstIpAddress.octets,
      0,
      TCP_PROTOCOL_NUMBER,
      ...uintToBytes(segmentBytes.length, 2),
    ]);
    const totalBytes = Uint8Array.from([...pseudoHeaderBytes, ...segmentBytes]);
    return computeIpChecksum(totalBytes);
  }

  // ### IpPayload ###

  byteLength(): number {
    const headerSize = 5 /* number of rows */ * 4; /* bytes per row */
    // TODO: include options
    // const optionsSize = 0;
    return headerSize + this.data.length;
  }

  toBytes({
    withChecksum = true,
  }: { withChecksum?: boolean } = {}): Uint8Array {
    const checksum = withChecksum ? this.checksum : 0;
    return Uint8Array.from([
      ...uintToBytes(this.sourcePort, 2),
      ...uintToBytes(this.destinationPort, 2),
      ...uintToBytes(this.sequenceNumber, 4),
      ...uintToBytes(this.acknowledgementNumber, 4),
      (this.dataOffset << 4) | this.reserved,
      ((this.reserved & 0b11) << 6) | this.flags.toByte(),
      ...uintToBytes(this.window, 2),
      ...uintToBytes(checksum, 2),
      ...uintToBytes(this.urgentPointer, 2),
      ...this.data,
    ]);
  }

  protocol(): number {
    return TCP_PROTOCOL_NUMBER;
  }

  getPacketType(): string {
    return "TCP";
  }

  getDetails(layer: Layer) {
    if (layer == Layer.Transport) {
      return {
        "Seq Number": this.sequenceNumber,
        "Ack Number": this.acknowledgementNumber,
        "Window Size": this.window,
        tcp_flags: {
          Urg: this.flags.urg,
          Ack: this.flags.ack,
          Psh: this.flags.psh,
          Rst: this.flags.rst,
          Syn: this.flags.syn,
          Fin: this.flags.fin,
        },
        Payload: this.data,
      };
    } else if (layer == Layer.App) {
      return { Request: new TextDecoder("utf-8").decode(this.data) };
    }
  }

  // ### IpPayload ###
}

function checkUint(n: number, numBits: number): void {
  if (numBits > 32) {
    throw new Error("Bitwidth more than 32 not supported");
  }
  // >>> 0 is to turn this into an unsigned integer again
  // https://stackoverflow.com/a/34897012
  const max = numBits === 32 ? 0xffffffff : ((1 << numBits) >>> 0) - 1;
  if (n < 0 || n > max) {
    throw new Error("Invalid value for uint" + numBits + ": " + n);
  }
}

function uintToBytes(n: number, numBytes: number): Uint8Array {
  const original = n;
  const bytes = new Uint8Array(numBytes);
  for (let i = 0; i < numBytes; i++) {
    bytes[numBytes - i - 1] = n & 0xff;
    n >>>= 8;
  }
  if (n !== 0) {
    throw new Error("Value too large for " + numBytes + " bytes: " + original);
  }
  return bytes;
}
