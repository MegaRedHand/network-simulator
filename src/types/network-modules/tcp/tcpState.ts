import { Ticker } from "pixi.js";
import { EthernetFrame } from "../../../packets/ethernet";
import { IpPayload, IPv4Packet } from "../../../packets/ip";
import { Flags, Port, TcpSegment } from "../../../packets/tcp";
import { dropPacket, sendViewPacket } from "../../packet";
import { ViewHost } from "../../view-devices";
import { ViewNetworkDevice } from "../../view-devices/vNetworkDevice";
import { AsyncQueue } from "../asyncQueue";
import { SegmentWithIp } from "../tcpModule";
import { GlobalContext } from "../../../context";

enum TcpStateEnum {
  // CLOSED = 0,
  // LISTEN = 1,
  SYN_SENT = 2,
  SYN_RECEIVED = 3,
  ESTABLISHED = 4,
  FIN_WAIT_1 = 5,
  FIN_WAIT_2 = 6,
  CLOSE_WAIT = 7,
  CLOSING = 8,
  LAST_ACK = 9,
  TIME_WAIT = 10,
}

const MAX_BUFFER_SIZE = 0xffff;

function getInitialSeqNumber() {
  // For random seqnums use:
  // return Math.floor(Math.random() * 0xffffffff);
  return 0;
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

const u32_MODULUS = 0x100000000;

export class TcpState {
  private srcHost: ViewHost;
  private srcPort: Port;
  private dstHost: ViewHost;
  private dstPort: Port;
  private tcpQueue: AsyncQueue<SegmentWithIp>;
  private sendQueue = new AsyncQueue<undefined>();
  private connectionQueue = new AsyncQueue<undefined>();
  private retransmissionQueue: RetransmissionQueue;

  // Buffer of data received
  private readBuffer = new BytesBuffer(MAX_BUFFER_SIZE);
  private readChannel = new AsyncQueue<number>();
  private readClosed = false;

  // Buffer of data to be sent
  private writeBuffer = new BytesBuffer(MAX_BUFFER_SIZE);
  private writeClosedSeqnum = -1;

  private state: TcpStateEnum;

  // TCP state variables
  // See https://datatracker.ietf.org/doc/html/rfc9293#section-3.3.1
  // SND.UNA
  private sendUnacknowledged: number;
  // SND.NXT
  private sendNext: number;
  // SND.WND
  private sendWindow = MAX_BUFFER_SIZE;
  // SND.UP
  // private sendUrgentPointer: number;
  // SND.WL1
  private seqNumForLastWindowUpdate: number;
  // SND.WL2
  private ackNumForLastWindowUpdate: number;
  // ISS
  private initialSendSeqNum: number;

  // RCV.NXT
  private recvNext: number;
  // RCV.WND
  private recvWindow = MAX_BUFFER_SIZE;

  // IRS
  private initialRecvSeqNum: number;

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

    this.retransmissionQueue = new RetransmissionQueue(this.srcHost.ctx);

    this.mainLoop();
  }

  // Open active connection
  async connect() {
    // Initialize the TCB
    this.initialSendSeqNum = getInitialSeqNumber();
    this.sendNext = (this.initialSendSeqNum + 1) % u32_MODULUS;
    this.sendUnacknowledged = this.initialSendSeqNum;

    // Send a SYN
    const flags = new Flags().withSyn();
    const segment = this.newSegment(this.initialSendSeqNum, 0).withFlags(flags);
    sendIpPacket(this.srcHost, this.dstHost, segment);

    // Move to SYN_SENT state
    this.state = TcpStateEnum.SYN_SENT;
    await this.connectionQueue.pop();
  }

  // Accept passive connection
  accept(synSegment: TcpSegment) {
    if (!synSegment.flags.syn) {
      return false;
    }
    // Initialize the TCB
    this.initialSendSeqNum = getInitialSeqNumber();
    this.sendNext = (this.initialSendSeqNum + 1) % u32_MODULUS;
    this.sendUnacknowledged = this.initialSendSeqNum;

    this.state = TcpStateEnum.SYN_RECEIVED;
    this.recvNext = (synSegment.sequenceNumber + 1) % u32_MODULUS;
    this.initialRecvSeqNum = synSegment.sequenceNumber;

    // Send a SYN-ACK
    const flags = new Flags().withSyn().withAck();
    const segment = this.newSegment(this.initialSendSeqNum, this.recvNext);
    sendIpPacket(this.srcHost, this.dstHost, segment.withFlags(flags));
    return true;
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
    if (
      segment.acknowledgementNumber !==
      (this.initialSendSeqNum + 1) % u32_MODULUS
    ) {
      return false;
    }
    this.recvNext = (segment.sequenceNumber + 1) % u32_MODULUS;
    this.initialRecvSeqNum = segment.sequenceNumber;
    this.sendNext = segment.acknowledgementNumber;
    this.sendWindow = segment.window;

    const ackSegment = this.newSegment(this.sendNext, this.recvNext);
    ackSegment.withFlags(new Flags().withAck());
    sendIpPacket(this.srcHost, this.dstHost, ackSegment);
  }

  private handleSegment(segment: TcpSegment) {
    // Sanity check: ports match with expected
    if (
      segment.sourcePort !== this.dstPort ||
      segment.destinationPort !== this.srcPort
    ) {
      throw new Error("segment not for this socket");
    }
    const { flags } = segment;
    if (this.state === TcpStateEnum.SYN_SENT) {
      // First, check the ACK bit
      if (flags.ack) {
        const ack = segment.acknowledgementNumber;
        if (ack <= this.initialSendSeqNum || ack > this.sendNext) {
          if (flags.rst) {
            console.debug("Invalid SYN_SENT ACK with RST");
            return false;
          }
          console.debug("Invalid SYN_SENT ACK, sending RST");
          this.newSegment(ack, 0).withFlags(new Flags().withRst());
          return false;
        }
        // Try to process ACK
        if (!this.isAckValid(segment.acknowledgementNumber)) {
          console.debug("Invalid SYN_SENT ACK");
          return false;
        }
      }
      if (flags.rst) {
        // TODO: handle gracefully
        if (flags.ack) {
          // drop the segment, enter CLOSED state, delete TCB, and return
          throw new Error("error: connection reset");
        } else {
          console.debug("SYN_SENT RST without ACK, dropping segment");
          return false;
        }
      }
      if (flags.syn) {
        this.recvNext = (segment.sequenceNumber + 1) % u32_MODULUS;
        this.initialRecvSeqNum = segment.sequenceNumber;
        if (flags.ack) {
          this.sendUnacknowledged = segment.acknowledgementNumber;
        }
        if (flags.ack) {
          // It's a valid SYN-ACK
          // Process the segment normally
          this.state = TcpStateEnum.ESTABLISHED;
          this.connectionQueue.push(undefined);
          return this.handleSegmentData(segment);
        } else {
          // It's a SYN
          if (segment.data.length > 0) {
            throw new Error("SYN segment with data not supported");
          }
          this.sendWindow = segment.window;
          this.seqNumForLastWindowUpdate = segment.sequenceNumber;
          this.ackNumForLastWindowUpdate = segment.acknowledgementNumber;
          // Send SYN-ACK
          this.newSegment(this.initialSendSeqNum, this.recvNext).withFlags(
            new Flags().withSyn().withAck(),
          );
          this.state = TcpStateEnum.SYN_RECEIVED;
        }
      }
      if (!(flags.rst || flags.syn)) {
        console.debug("SYN_SENT segment without SYN or RST");
        return false;
      }
      return true;
    }
    // Check the sequence number is valid
    const segSeq = segment.sequenceNumber;
    const segLen = segment.data.length;
    if (!this.isSeqNumValid(segSeq, segLen)) {
      console.debug("Sequence number not valid");
      return false;
    }

    // TODO: handle RST or SYN flags
    if (flags.rst || flags.syn) {
      // TODO: handle this gracefully
      throw new Error("error: RST bit set");
    }

    // If the ACK bit is off, drop the segment.
    if (!flags.ack) {
      console.debug("ACK bit is off, dropping segment");
      return false;
    }
    if (this.state === TcpStateEnum.SYN_RECEIVED) {
      if (!this.isAckValid(segment.acknowledgementNumber)) {
        console.debug("ACK invalid, dropping segment");
        this.newSegment(segment.acknowledgementNumber, 0).withFlags(
          new Flags().withRst(),
        );
        return false;
      }
      this.state = TcpStateEnum.ESTABLISHED;
      this.connectionQueue.push(undefined);
      this.sendWindow = segment.window;
      this.seqNumForLastWindowUpdate = segment.sequenceNumber;
      this.ackNumForLastWindowUpdate = segment.acknowledgementNumber;
    } else if (
      this.state === TcpStateEnum.ESTABLISHED ||
      this.state === TcpStateEnum.FIN_WAIT_1 ||
      this.state === TcpStateEnum.FIN_WAIT_2 ||
      this.state === TcpStateEnum.CLOSE_WAIT ||
      this.state === TcpStateEnum.CLOSING
    ) {
      if (segment.acknowledgementNumber <= this.sendUnacknowledged) {
        // Ignore the ACK
      } else if (segment.acknowledgementNumber > this.sendNext) {
        console.debug("ACK for future segment, dropping segment");
        this.newSegment(this.sendNext, this.recvNext).withFlags(
          new Flags().withAck(),
        );
        return false;
      } else {
        this.sendUnacknowledged = segment.acknowledgementNumber;
      }
      if (!this.processAck(segment)) {
        console.debug("ACK processing failed, dropping segment");
        return false;
      }

      if (this.state === TcpStateEnum.FIN_WAIT_1) {
        if (this.sendUnacknowledged === this.writeClosedSeqnum) {
          this.state = TcpStateEnum.FIN_WAIT_2;
        }
      }
    }

    // Process the segment data
    if (!this.handleSegmentData(segment)) {
      console.debug("Segment data processing failed, dropping segment");
      return false;
    }

    if (flags.fin) {
      this.recvNext = (this.recvNext + 1) % u32_MODULUS;
      this.readClosed = true;
      this.readChannel.push(0);
      this.notifySendPackets();
    }

    return true;
  }

  private dropSegment(segment: TcpSegment) {
    const packet = new IPv4Packet(this.srcHost.ip, this.dstHost.ip, segment);
    const frame = new EthernetFrame(this.srcHost.mac, this.dstHost.mac, packet);
    dropPacket(this.srcHost.viewgraph, this.srcHost.id, frame);
  }

  private handleSegmentData(segment: TcpSegment) {
    // NOTE: for simplicity, we ignore cases where RCV.NXT != SEG.SEQ
    if (segment.sequenceNumber !== this.recvNext) {
      return false;
    }
    const receivedData = segment.data;
    // NOTE: for simplicity, we ignore cases where the data is only partially
    // inside the window
    if (receivedData.length > this.recvWindow) {
      throw new Error("buffer overflow");
    }
    this.readBuffer.write(receivedData);
    this.readChannel.push(receivedData.length);
    this.recvNext =
      (segment.sequenceNumber + receivedData.length) % u32_MODULUS;
    this.recvWindow = MAX_BUFFER_SIZE - this.readBuffer.bytesAvailable();
    // We should send back an ACK segment
    this.notifySendPackets();
    return true;
  }

  async read(output: Uint8Array): Promise<number> {
    // Wait for there to be data in the read buffer
    while (this.readBuffer.isEmpty() && !this.readClosed) {
      await this.readChannel.pop();
    }
    // Consume the data and return it
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
    if (this.sendWindowSize() > 0 && writeLength > 0) {
      this.notifySendPackets();
    }
    return writeLength;
  }

  closeWrite() {
    this.writeClosedSeqnum =
      (this.sendUnacknowledged + this.writeBuffer.bytesAvailable()) %
      u32_MODULUS;
    this.notifySendPackets();
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
        this.isInReceiveWindow((segSeq + segLen - 1) % u32_MODULUS)
      );
    }
  }

  private isInReceiveWindow(n: number) {
    const recvWindowHigh = (this.recvNext + this.recvWindow) % u32_MODULUS;
    if (recvWindowHigh < this.recvNext) {
      return this.recvNext <= n || n < recvWindowHigh;
    }
    return this.recvNext <= n && n < recvWindowHigh;
  }

  private isAckValid(ackNum: number) {
    if (this.sendNext < this.sendUnacknowledged) {
      return this.sendUnacknowledged < ackNum || ackNum <= this.sendNext;
    }
    return this.sendUnacknowledged < ackNum && ackNum <= this.sendNext;
  }

  private processAck(segment: TcpSegment) {
    // From https://datatracker.ietf.org/doc/html/rfc9293#section-3.10.7.4-2.5.2.2.2.3.1
    // If the ACK is for a packet not yet sent, drop it
    if (this.sendNext < segment.acknowledgementNumber) {
      return false;
    }
    // If SND.UNA < SEG.ACK =< SND.NXT, set SND.UNA <- SEG.ACK
    if (
      this.sendUnacknowledged === undefined ||
      this.sendUnacknowledged <= segment.acknowledgementNumber
    ) {
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
      this.seqNumForLastWindowUpdate === undefined ||
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
    setTimeout(() => this.sendQueue.push(undefined), 5);
  }

  private async mainLoop() {
    const MAX_SEGMENT_SIZE = 1400;

    let recheckPromise = this.sendQueue.pop();
    let receivedSegmentPromise = this.tcpQueue.pop();
    let retransmitPromise = this.retransmissionQueue.pop();

    while (!this.readClosed || this.writeClosedSeqnum === -1) {
      const result = await Promise.race([
        recheckPromise,
        receivedSegmentPromise,
        retransmitPromise,
      ]);

      if (result === undefined) {
        recheckPromise = this.sendQueue.pop();
        this.notifiedSendPackets = false;
      } else if ("segment" in result) {
        receivedSegmentPromise = this.tcpQueue.pop();
        if (this.handleSegment(result.segment)) {
          this.retransmissionQueue.ack(this.recvNext);
        } else {
          this.dropSegment(result.segment);
        }
        continue;
      } else if ("seqNum" in result) {
        retransmitPromise = this.retransmissionQueue.pop();
        this.sendPacket(result.seqNum, result.size);
        continue;
      }

      do {
        const segment = this.newSegment(this.sendNext, this.recvNext).withFlags(
          new Flags().withAck(),
        );

        const sendSize = Math.min(this.sendWindowSize(), MAX_SEGMENT_SIZE);
        if (sendSize > 0) {
          const data = new Uint8Array(sendSize);
          const offset =
            (u32_MODULUS + this.sendNext - this.sendUnacknowledged) %
            u32_MODULUS;
          const writeLength = this.writeBuffer.peek(offset, data);

          if (writeLength > 0) {
            segment.withData(data.subarray(0, writeLength));
            this.sendNext = (this.sendNext + writeLength) % u32_MODULUS;
          }
        }
        segment.window = this.recvWindow;

        if (this.sendNext === this.writeClosedSeqnum) {
          this.sendNext = (this.sendNext + 1) % u32_MODULUS;
          segment.flags.withFin();
        }
        sendIpPacket(this.srcHost, this.dstHost, segment);
        this.retransmissionQueue.push(
          segment.sequenceNumber,
          segment.data.length,
        );
        // Repeat until we have no more data to send
      } while (this.writeBuffer.bytesAvailable() > this.sendWindowSize());
    }
  }

  private sendPacket(seqNum: number, size: number) {
    const segment = this.newSegment(seqNum, this.recvNext).withFlags(
      new Flags().withAck(),
    );

    const data = new Uint8Array(size);
    const offset =
      (u32_MODULUS + seqNum - this.sendUnacknowledged) % u32_MODULUS;
    const writeLength = this.writeBuffer.peek(offset, data);

    if (writeLength > 0) {
      segment.withData(data.subarray(0, writeLength));
    }
    segment.window = this.recvWindow;

    if ((seqNum + size) % u32_MODULUS === this.writeClosedSeqnum) {
      segment.flags.withFin();
    }
    this.retransmissionQueue.push(segment.sequenceNumber, segment.data.length);
    sendIpPacket(this.srcHost, this.dstHost, segment);
  }

  private sendWindowSize() {
    // TODO: add congestion control
    return (
      (this.sendUnacknowledged + this.sendWindow - this.sendNext) % u32_MODULUS
    );
  }
}

const RETRANSMIT_TIMEOUT = 15 * 1000;

interface RetransmissionQueueItem {
  seqNum: number;
  size: number;
}

class RetransmissionQueue {
  private timeoutQueue: [RetransmissionQueueItem, (t: Ticker) => void][] = [];
  private itemQueue = new AsyncQueue<RetransmissionQueueItem>();

  private ctx: GlobalContext;

  constructor(ctx: GlobalContext) {
    this.ctx = ctx;
  }

  push(seqNum: number, size: number) {
    const item = {
      seqNum,
      size,
    };
    let progress = 0;
    const tick = (ticker: Ticker) => {
      progress += ticker.elapsedMS * this.ctx.getCurrentSpeed();
      if (progress >= RETRANSMIT_TIMEOUT) {
        this.itemQueue.push(item);
        Ticker.shared.remove(tick, this);
      }
    };
    Ticker.shared.add(tick, this);
    this.timeoutQueue.push([item, tick]);
  }

  async pop() {
    return await this.itemQueue.pop();
  }

  ack(ackNum: number) {
    this.timeoutQueue = this.timeoutQueue.filter(([item, tick]) => {
      if (
        item.seqNum < ackNum ||
        (item.seqNum + item.size) % u32_MODULUS <= ackNum
      ) {
        Ticker.shared.remove(tick, this);
        return false;
      }
      return true;
    });
  }
}

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
