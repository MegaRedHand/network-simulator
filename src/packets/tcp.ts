import { IpPayload, TCP_PROTOCOL_NUMBER } from "./ip";

class Flags {
  // Urgent Pointer field significant
  readonly urg = false;
  // Acknowledgment field significant
  public ack: boolean;
  // Push function
  readonly psh = false;
  // Reset the connection
  readonly rst = false;
  // Synchronize sequence numbers
  public syn: boolean;
  // No more data from sender
  public fin: boolean;

  // 6 bits
  toByte(): number {
    return [this.urg, this.ack, this.psh, this.rst, this.syn, this.fin].reduce(
      (acc, flag, index) => {
        return acc | bitSet(flag, 5 - index);
      },
      0,
    );
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
  readonly window: number = 0xffff;

  // 2 bytes
  get checksum(): number {
    return 0;
  }

  // 2 bytes
  readonly urgentPointer = 0;

  // 0-40 bytes
  // TODO: implement options
  // options: Option[];

  // Variable size
  data: Uint8Array;

  constructor(
    srcPort: number,
    dstPort: number,
    seqNum: number,
    ackNum: number,
    flags: Flags,
    data: Uint8Array,
  ) {
    checkPort(srcPort);
    checkPort(dstPort);
    this.sourcePort = srcPort;
    this.destinationPort = dstPort;
    this.sequenceNumber = seqNum;
    this.acknowledgementNumber = ackNum;
    this.flags = flags;
    this.data = data;
  }

  // ### IpPayload ###
  toBytes(): Uint8Array {
    const checksum = this.checksum;
    return Uint8Array.from([
      ...numberTobytes(this.sourcePort, 2),
      ...numberTobytes(this.destinationPort, 2),
      ...numberTobytes(this.sequenceNumber, 4),
      ...numberTobytes(this.acknowledgementNumber, 4),
      (this.dataOffset << 4) | this.reserved,
      ((this.reserved & 0b11) << 6) | this.flags.toByte(),
      ...numberTobytes(this.window, 2),
      ...numberTobytes(checksum, 2),
      ...numberTobytes(this.urgentPointer, 2),
      ...this.data,
    ]);
  }

  protocol(): number {
    return TCP_PROTOCOL_NUMBER;
  }
  // ### IpPayload ###
}

function checkPort(port: number): void {
  if (port < 0 || port > 0xffff) {
    throw new Error("Invalid port");
  }
}

function numberTobytes(n: number, numBytes: number): Uint8Array {
  const bytes = new Uint8Array(numBytes);
  for (let i = 0; i < numBytes; i++) {
    bytes[numBytes - i - 1] = n & 0xff;
    n >>= 8;
  }
  return bytes;
}
