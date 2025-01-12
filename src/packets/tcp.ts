import { IpPayload, TCP_PROTOCOL_NUMBER } from "./ip";

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
  dataOffset: number;

  // 6 bits
  // Reserved for future use.  Must be zero.
  // reserved: number = 0;

  // Flags
  // 6 bits
  // Urgent Pointer field significant
  urg: boolean;
  // Acknowledgment field significant
  ack: boolean;
  // Push function
  psh: boolean;
  // Reset the connection
  rst: boolean;
  // Synchronize sequence numbers
  syn: boolean;
  // No more data from sender
  fin: boolean;

  // 2 bytes
  // The number of data octets beginning with the one indicated in the
  // acknowledgment field which the sender of this segment is willing to
  // accept.
  window: number;

  // 2 bytes
  get checksum(): number {
    return 0;
  }

  // 2 bytes
  urgentPointer: number;

  // 0-40 bytes
  // TODO: implement options
  // options: Option[];

  // Variable size
  data: Uint8Array;

  // ### IpPayload ###
  toBytes(): Uint8Array {
    return new Uint8Array(0);
  }

  protocol(): number {
    return TCP_PROTOCOL_NUMBER;
  }
  // ### IpPayload ###
}
