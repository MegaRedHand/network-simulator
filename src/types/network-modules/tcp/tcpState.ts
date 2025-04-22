import { EthernetFrame } from "../../../packets/ethernet";
import { IpPayload, IPv4Packet } from "../../../packets/ip";
import { Flags, TcpSegment } from "../../../packets/tcp";
import { sendViewPacket } from "../../packet";
import { ViewHost } from "../../view-devices";
import { ViewNetworkDevice } from "../../view-devices/vNetworkDevice";
import { AsyncQueue } from "../asyncQueue";
import { SegmentWithIp } from "../tcpModule";

// TODO: import
type Port = number;

const MAX_BUFFER_SIZE = 0xffff;

function getInitialSeqNumber() {
  return Math.floor(Math.random() * 0xffffffff);
}

function sendIpPacket(src: ViewHost, dst: ViewHost, payload: IpPayload) {
  const viewgraph = src.viewgraph;

  // TODO: use MAC and IP of the interfaces used
  let nextHopMac = dst.mac;
  const path = viewgraph.getPathBetween(src.id, dst.id);
  if (!path) return;
  for (const id of path.slice(1)) {
    const device = viewgraph.getDevice(id);
    // if there’s a router in the middle, first send frame to router mac
    if (device instanceof ViewNetworkDevice) {
      nextHopMac = device.mac;
      break;
    }
  }
  const ipPacket = new IPv4Packet(src.ip, dst.ip, payload);
  const frame = new EthernetFrame(src.mac, nextHopMac, ipPacket);

  sendViewPacket(src.viewgraph, src.id, frame);
}

// TODO: add overflow checks
export class TcpState {
  private srcHost: ViewHost;
  private srcPort: Port;
  private dstHost: ViewHost;
  private dstPort: Port;
  private tcpQueue: AsyncQueue<SegmentWithIp>;
  private sendQueue = new AsyncQueue<undefined>();
  private sendingPackets: Promise<void> | null = null;

  // Buffer of data received
  private readBuffer = new BytesBuffer(MAX_BUFFER_SIZE);
  private readClosed = false;

  // Buffer of data to be sent
  private writeBuffer = new BytesBuffer(MAX_BUFFER_SIZE);
  private writeClosedSeqnum = -1;

  // See https://datatracker.ietf.org/doc/html/rfc9293#section-3.3.1
  // SND.UNA
  private sendUnacknowledged: number;
  // SND.NXT
  private sendNext: number;
  // SND.WND
  private sendWindow: number;
  // SND.UP
  // private sendUrgentPointer: number;
  // SND.WL1
  private seqNumForLastWindowUpdate: number;
  // SND.WL2
  private ackNumForLastWindowUpdate: number;
  // ISS
  private initialSendSeqNum;

  // RCV.NXT
  private recvNext: number;
  // RCV.WND
  private recvWindow = MAX_BUFFER_SIZE;

  // IRS
  // private initialRecvSeqNum: number;

  constructor(
    srcHost: ViewHost,
    srcPort: Port,
    dstHost: ViewHost,
    dstPort: Port,
    tcpQueue: AsyncQueue<SegmentWithIp>,
  ) {
    this.srcHost = srcHost;
    this.srcPort = srcPort;
    this.dstHost = dstHost;
    this.dstPort = dstPort;
    this.tcpQueue = tcpQueue;

    this.initialSendSeqNum = getInitialSeqNumber();
  }

  startConnection() {
    const flags = new Flags().withSyn();
    const segment = this.newSegment(this.initialSendSeqNum, 0).withFlags(flags);
    sendIpPacket(this.srcHost, this.dstHost, segment);
  }

  recvSynAck(segment: TcpSegment) {
    if (!segment.flags.syn || !segment.flags.ack) {
      return false;
    }
    if (segment.acknowledgementNumber !== this.initialSendSeqNum + 1) {
      return false;
    }
    this.recvNext = segment.sequenceNumber + 1;
    // this.initialRecvSeqNum = segment.sequenceNumber;
    this.sendNext = segment.acknowledgementNumber;
    this.sendWindow = segment.window;

    const ackSegment = this.newSegment(this.sendNext, this.recvNext);
    ackSegment.withFlags(new Flags().withAck());
    sendIpPacket(this.srcHost, this.dstHost, ackSegment);

    // start sending packets
    if (!this.sendingPackets) {
      this.sendingPackets = this.mainLoop();
    }
  }

  recvSegment(receivedSegment: TcpSegment) {
    // Sanity check: ports match with expected
    if (
      receivedSegment.destinationPort !== this.dstPort ||
      receivedSegment.sourcePort !== this.srcPort
    ) {
      throw new Error("segment not for this socket");
    }
    // Check the sequence number is valid
    const segSeq = receivedSegment.sequenceNumber;
    const segLen = receivedSegment.data.length;
    if (!this.isSeqNumValid(segSeq, segLen)) {
      return false;
    }

    // TODO: check RST flag

    // For now this only accepts ACK segments.
    // 3WHS are handled outside of this function
    if (!receivedSegment.flags.ack) {
      return false;
    }
    if (!this.processAck(receivedSegment)) {
      return false;
    }

    // Process the segment data
    // NOTE: for simplicity, we ignore cases where RCV.NXT != SEG.SEQ
    if (receivedSegment.sequenceNumber === this.recvNext) {
      let receivedData = receivedSegment.data;
      // NOTE: for simplicity, we ignore cases where the data is only partially
      // inside the window
      if (receivedData.length > this.recvWindow) {
        throw new Error("buffer overflow");
      }
      this.readBuffer.write(receivedData);
      this.recvNext = receivedSegment.sequenceNumber + receivedData.length;
      this.recvWindow = MAX_BUFFER_SIZE - this.readBuffer.bytesAvailable();
      // We should send back an ACK segment
      this.notifySendPackets();
    }

    // If FIN, mark read end as closed
    if (receivedSegment.flags.fin) {
      // The flag counts as a byte
      this.recvNext++;
      this.readClosed = true;
    }

    // start sending packets
    if (!this.sendingPackets) {
      this.sendingPackets = this.mainLoop();
    }
    return true;
  }

  read(output: Uint8Array): number {
    const readLength = this.readBuffer.read(output);
    if (readLength === 0 && this.readClosed) {
      return -1;
    }
    this.recvWindow = MAX_BUFFER_SIZE - this.readBuffer.bytesAvailable();
    return readLength;
  }

  write(input: Uint8Array): number {
    if (this.writeClosedSeqnum >= 0) {
      throw new Error("write closed");
    }
    const writeLength = this.writeBuffer.write(input);
    if (this.sendWindow > 0 && writeLength > 0) {
      this.notifySendPackets();
    }
    return writeLength;
  }

  closeWrite() {
    this.writeClosedSeqnum = this.sendNext;
    const segment = this.newSegment(this.sendNext, this.recvNext).withFlags(
      new Flags().withFin().withAck(),
    );
    this.sendNext++;
    sendIpPacket(this.srcHost, this.dstHost, segment);
  }

  // utils

  private newSegment(seqNum: number, ackNum: number) {
    return new TcpSegment(this.srcPort, this.dstPort, seqNum, ackNum);
  }

  private isSeqNumValid(segSeq: number, segLen: number) {
    const lengthIsZero = segLen === 0;
    const windowIsZero = this.recvWindow === 0;

    if (lengthIsZero && windowIsZero) {
      return segSeq === this.recvNext;
    } else if (lengthIsZero && !windowIsZero) {
      return this.isInReceiveWindow(segSeq);
    } else if (!lengthIsZero && windowIsZero) {
      return false;
    } else {
      return (
        this.isInReceiveWindow(segSeq) ||
        this.isInReceiveWindow(segSeq + segLen - 1)
      );
    }
  }

  private isInReceiveWindow(n: number) {
    return this.recvNext <= n && n < this.recvNext + this.recvWindow;
  }

  private processAck(segment: TcpSegment) {
    // From https://datatracker.ietf.org/doc/html/rfc9293#section-3.10.7.4-2.5.2.2.2.3.1
    // If the ACK is for a packet not yet sent, drop it
    if (this.sendNext < segment.acknowledgementNumber) {
      return false;
    }
    // If SND.UNA < SEG.ACK =< SND.NXT, set SND.UNA <- SEG.ACK
    if (this.sendUnacknowledged <= segment.acknowledgementNumber) {
      this.sendUnacknowledged = segment.acknowledgementNumber;
      if (this.isSegmentNewer(segment)) {
        // set SND.WND <- SEG.WND, set SND.WL1 <- SEG.SEQ, and set SND.WL2 <- SEG.ACK.
        this.sendWindow = segment.window;
        this.seqNumForLastWindowUpdate = segment.sequenceNumber;
        this.ackNumForLastWindowUpdate = segment.acknowledgementNumber;
      }
    }
  }

  private isSegmentNewer(segment: TcpSegment): boolean {
    // Since both SEQ and ACK numbers are monotonic, we can use
    // them to determine if the segment is newer than the last
    // one that was used for updating the window
    //
    // SND.WL1 < SEG.SEQ or (SND.WL1 = SEG.SEQ and SND.WL2 =< SEG.ACK)
    return (
      this.seqNumForLastWindowUpdate < segment.sequenceNumber ||
      (this.seqNumForLastWindowUpdate === segment.sequenceNumber &&
        this.ackNumForLastWindowUpdate <= segment.acknowledgementNumber)
    );
  }

  private notifiedSendPackets = false;

  private notifySendPackets() {
    if (this.notifiedSendPackets) {
      return;
    }
    this.notifiedSendPackets = true;
    setTimeout(() => this.sendQueue.push(undefined), 50);
  }

  private async mainLoop() {
    const MAX_SEGMENT_SIZE = 1400;

    let recheckPromise = this.sendQueue.pop();
    let receivedSegmentPromise = this.tcpQueue.pop();

    let retransmitTimeoutId: NodeJS.Timeout | null = null;

    const clearTimer = () => {
      if (retransmitTimeoutId === null) {
        return;
      }
      clearTimeout(retransmitTimeoutId);
      retransmitTimeoutId = null;
    };

    const setTimer = () => {
      if (retransmitTimeoutId === null) {
        return;
      }
      retransmitTimeoutId = setTimeout(() => {
        retransmitTimeoutId = null;
        this.sendNext = this.sendUnacknowledged;
        this.notifySendPackets();
      }, RETRANSMIT_TIMEOUT);
    };

    while (true) {
      const result = await Promise.race([
        recheckPromise,
        receivedSegmentPromise,
      ]);

      if (result !== undefined) {
        receivedSegmentPromise = this.tcpQueue.pop();
        if (!this.recvSegment(result.segment)) {
          continue;
        }
        // If we got a valid segment, we can refresh the timer
        clearTimer();
      } else {
        recheckPromise = this.sendQueue.pop();
      }

      do {
        const segment = this.newSegment(this.sendNext, this.recvNext).withFlags(
          new Flags().withAck(),
        );

        const sendSize = Math.min(this.sendWindowSize(), MAX_SEGMENT_SIZE);
        if (sendSize > 0) {
          const data = new Uint8Array(sendSize);
          const writeLength = this.writeBuffer.peek(this.sendNext, data);

          if (writeLength > 0) {
            segment.withData(data.subarray(0, writeLength));
            this.sendNext += writeLength;
          }
        }
        segment.window = this.recvWindow;

        if (this.sendNext === this.writeClosedSeqnum) {
          this.sendNext++;
          segment.flags.withFin();
        }
        sendIpPacket(this.srcHost, this.dstHost, segment);
        // Repeat until we have no more data to send
      } while (this.writeBuffer.bytesAvailable() > this.sendWindowSize());
    }
  }

  private sendWindowSize() {
    // TODO: add congestion control
    return this.sendUnacknowledged + this.sendWindow - this.sendNext;
  }
}

function sleep(ms?: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRANSMIT_TIMEOUT = 60 * 1000;

class BytesBuffer {
  private buffer: Uint8Array;
  private length: number;

  constructor(size: number) {
    this.buffer = new Uint8Array(size);
    this.length = 0;
  }

  peek(offset: number, output: Uint8Array): number {
    if (offset > this.length) {
      return 0;
    }
    const readLength = Math.min(this.length - offset, output.length);
    if (readLength == 0) {
      return 0;
    }
    output.set(this.buffer.subarray(offset, readLength + offset));
    return readLength;
  }

  shift(offset: number) {
    if (offset > this.length) {
      throw new Error("offset is greater than length");
    }
    this.buffer.copyWithin(0, offset, this.length);
    this.length -= offset;
  }

  read(output: Uint8Array): number {
    const readLength = this.peek(0, output);
    this.shift(readLength);
    return readLength;
  }

  write(data: Uint8Array): number {
    const newLength = this.length + data.length;
    if (newLength > this.buffer.length) {
      return 0;
    }
    this.buffer.set(data, this.length);
    this.length = newLength;
    return data.length;
  }

  bytesAvailable() {
    return this.length;
  }

  isEmpty() {
    return this.bytesAvailable() === 0;
  }
}
