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
const MAX_SEGMENT_SIZE = 1460;
const u32_MODULUS = 0x100000000; // 2^32

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

export class TcpState {
  private ctx: GlobalContext;
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
  private writeChannel = new AsyncQueue<number>();
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

  private rttEstimator: RTTEstimator;
  private congestionControl = new CongestionControl();

  constructor(
    srcHost: ViewHost,
    srcPort: Port,
    dstHost: ViewHost,
    dstPort: Port,
    tcpQueue: AsyncQueue<SegmentWithIp>,
  ) {
    this.ctx = srcHost.ctx;
    this.srcHost = srcHost;
    this.srcPort = srcPort;
    this.dstHost = dstHost;
    this.dstPort = dstPort;

    this.tcpQueue = tcpQueue;

    this.rttEstimator = new RTTEstimator(this.srcHost.ctx);
    this.retransmissionQueue = new RetransmissionQueue(
      this.srcHost.ctx,
      this.rttEstimator,
    );

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

    this.rttEstimator.startMeasurement(this.initialSendSeqNum);

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
    this.rttEstimator.startMeasurement(this.initialSendSeqNum);
    return true;
  }

  // TODO: remove unused
  startConnection() {
    const flags = new Flags().withSyn();
    const segment = this.newSegment(this.initialSendSeqNum, 0).withFlags(flags);
    sendIpPacket(this.srcHost, this.dstHost, segment);
  }

  // TODO: remove unused
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
          if (!this.handleSegmentData(segment)) {
            console.debug("Segment data processing failed");
            return false;
          }
          return true;
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
    }
    if (
      this.state === TcpStateEnum.ESTABLISHED ||
      this.state === TcpStateEnum.FIN_WAIT_1 ||
      this.state === TcpStateEnum.FIN_WAIT_2 ||
      this.state === TcpStateEnum.CLOSE_WAIT ||
      this.state === TcpStateEnum.CLOSING
    ) {
      if (segment.acknowledgementNumber <= this.sendUnacknowledged) {
        if (
          segment.acknowledgementNumber === this.sendUnacknowledged &&
          segment.acknowledgementNumber !== this.writeClosedSeqnum + 1
        ) {
          // Duplicate ACK
          if (!this.congestionControl.notifyDupAck()) {
            this.retransmitFirstSegment();
          }
        }
        // Ignore the ACK
      } else if (segment.acknowledgementNumber > this.sendNext) {
        console.debug("ACK for future segment, dropping segment");
        this.newSegment(this.sendNext, this.recvNext).withFlags(
          new Flags().withAck(),
        );
        return false;
      } else {
        this.processAck(segment);
      }

      // If SND.UNA < SEG.ACK =< SND.NXT, set SND.UNA <- SEG.ACK
      if (this.isSegmentNewer(segment)) {
        // set SND.WND <- SEG.WND, set SND.WL1 <- SEG.SEQ, and set SND.WL2 <- SEG.ACK.
        this.sendWindow = segment.window;
        this.seqNumForLastWindowUpdate = segment.sequenceNumber;
        this.ackNumForLastWindowUpdate = segment.acknowledgementNumber;
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
    const seqNum = segment.flags.syn
      ? (segment.sequenceNumber + 1) % u32_MODULUS
      : segment.sequenceNumber;
    if (seqNum !== this.recvNext) {
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
    this.recvNext = (seqNum + receivedData.length) % u32_MODULUS;
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

  async write(input: Uint8Array): Promise<number> {
    if (this.writeClosedSeqnum >= 0) {
      throw new Error("write closed");
    }
    let totalWrote = 0;
    while (totalWrote < input.length) {
      const writeLength = this.writeBuffer.write(input.subarray(totalWrote));
      if (writeLength === 0) {
        // Buffer is full, wait for space
        await this.writeChannel.pop();
      } else {
        totalWrote += writeLength;
        if (this.sendWindowSize() > 0) {
          this.notifySendPackets();
        }
      }
    }
    return totalWrote;
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

  private processAck(segment: TcpSegment) {
    const ackNum = segment.acknowledgementNumber;
    // Don't count the FIN or SYN bytes
    const finByte =
      (ackNum === this.writeClosedSeqnum + 1 ? 1 : 0) +
      (ackNum === this.initialSendSeqNum + 1 ? 1 : 0);

    const acknowledgedBytes =
      (u32_MODULUS + ackNum - this.sendUnacknowledged - finByte) % u32_MODULUS;

    if (acknowledgedBytes === 0) {
      return;
    }

    // Remove ACKed bytes from queue
    this.retransmissionQueue.ack(ackNum);
    this.writeBuffer.shift(acknowledgedBytes);
    this.writeChannel.push(0);

    // Notify Congestion Control module
    this.congestionControl.notifyAck(acknowledgedBytes);
    this.sendUnacknowledged = ackNum;
    // Update RTT estimations
    this.rttEstimator.finishMeasurement(ackNum);

    // Transmit new segments
    this.notifySendPackets();
  }

  private notifiedSendPackets = false;

  private notifySendPackets() {
    if (this.notifiedSendPackets) {
      return;
    }
    this.notifiedSendPackets = true;
    setTimeout(
      () => this.sendQueue.push(undefined),
      150 * this.ctx.getCurrentSpeed(),
    );
  }

  private async mainLoop() {
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
        if (!this.handleSegment(result.segment)) {
          this.dropSegment(result.segment);
        }
        continue;
      } else if ("seqNum" in result) {
        retransmitPromise = this.retransmissionQueue.pop();
        // Retransmit the segment
        this.resendPacket(result.seqNum, result.size);
        this.congestionControl.notifyTimeout();
        continue;
      }

      const segment = this.newSegment(this.sendNext, this.recvNext).withFlags(
        new Flags().withAck(),
      );

      const sendSize = Math.min(this.sendWindowSize(), MAX_SEGMENT_SIZE);
      if (sendSize > 0) {
        const data = new Uint8Array(sendSize);
        const offset =
          (u32_MODULUS + this.sendNext - this.sendUnacknowledged) % u32_MODULUS;
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
      this.rttEstimator.startMeasurement(segment.sequenceNumber);
      sendIpPacket(this.srcHost, this.dstHost, segment);
      this.retransmissionQueue.push(
        segment.sequenceNumber,
        segment.data.length,
      );
      // Repeat until we have no more data to send, or the window is full
      const bytesInFlight = this.sendNext - this.sendUnacknowledged;
      if (
        this.writeBuffer.bytesAvailable() > bytesInFlight &&
        this.sendWindowSize() > 0
      ) {
        this.notifySendPackets();
      }
    }
  }

  private resendPacket(seqNum: number, size: number) {
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
    this.rttEstimator.discardMeasurement(segment.sequenceNumber);
  }

  private retransmitFirstSegment() {
    // Remove item from the queue
    const item = this.retransmissionQueue.getFirstSegment();
    if (!item) {
      return;
    }
    // Resend packet
    this.resendPacket(item.seqNum, item.size);
  }

  private sendWindowSize() {
    // TODO: add congestion control
    const rwnd = this.sendWindow;
    const cwnd = this.congestionControl.getCwnd();

    const windowSize = Math.min(rwnd, cwnd);
    const bytesInFlight = this.sendNext - this.sendUnacknowledged;
    return (windowSize - bytesInFlight) % u32_MODULUS;
  }
}

interface RetransmissionQueueItem {
  seqNum: number;
  size: number;
}

class RetransmissionQueue {
  private timeoutQueue: [RetransmissionQueueItem, (t: Ticker) => void][] = [];
  private itemQueue = new AsyncQueue<RetransmissionQueueItem>();

  private ctx: GlobalContext;
  private rttEstimator: RTTEstimator;

  constructor(ctx: GlobalContext, rttEstimator: RTTEstimator) {
    this.ctx = ctx;
    this.rttEstimator = rttEstimator;
  }

  push(seqNum: number, size: number) {
    const item = { seqNum, size };
    let progress = 0;
    const tick = (ticker: Ticker) => {
      progress += ticker.elapsedMS * this.ctx.getCurrentSpeed();
      if (progress >= this.rttEstimator.getRtt()) {
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

  getFirstSegment() {
    if (this.timeoutQueue.length === 0) {
      return;
    }
    let firstSegmentItem = this.timeoutQueue[0];
    this.timeoutQueue.forEach((element) => {
      if (element[0].seqNum < firstSegmentItem[0].seqNum) {
        firstSegmentItem = element;
      }
    });
    // Remove the segment from the queue
    this.ack(firstSegmentItem[0].seqNum + 1);
    return firstSegmentItem[0];
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
    if (this.length === this.buffer.length) {
      return 0;
    }
    const newLength = Math.min(this.buffer.length, this.length + data.length);
    const dataSlice = data.subarray(0, newLength - this.length);
    this.buffer.set(dataSlice, this.length);
    this.length = newLength;
    return dataSlice.length;
  }

  bytesAvailable() {
    return this.length;
  }

  isEmpty() {
    return this.bytesAvailable() === 0;
  }
}

type CongestionControlStateBehavior =
  | SlowStart
  | CongestionAvoidance
  | FastRecovery;

class CongestionControl {
  private state: CongestionControlState;
  private stateBehavior: CongestionControlStateBehavior;

  constructor() {
    this.state = {
      cwnd: 1 * MAX_SEGMENT_SIZE,
      ssthresh: Infinity,
      dupAckCount: 0,
    };
    this.stateBehavior = new SlowStart();
  }

  getCwnd(): number {
    return this.state.cwnd;
  }

  notifyDupAck(): boolean {
    this.stateBehavior.handleAck(this.state, 0);
    return this.state.dupAckCount === 3;
  }

  notifyAck(byteCount: number) {
    this.stateBehavior.handleAck(this.state, byteCount);
  }

  notifyTimeout() {
    this.state.ssthresh = Math.floor(this.state.cwnd / 2);
    this.state.cwnd = 1 * MAX_SEGMENT_SIZE;
    this.state.dupAckCount = 0;

    console.log("TCP Timeout. Switching to Slow Start");
    this.stateBehavior = new SlowStart();
  }
}

interface CongestionControlState {
  // The congestion window size, as a number of MSS
  cwnd: number;
  // The slow start threshold
  ssthresh: number;
  // The number of duplicate ACKs received
  dupAckCount: number;
}

class SlowStart {
  handleAck(
    state: CongestionControlState,
    byteCount: number,
  ): CongestionControlStateBehavior {
    if (byteCount === 0) {
      // Duplicate ACK
      state.dupAckCount++;
      if (state.dupAckCount === 3) {
        return this;
      }
      state.ssthresh = Math.floor(state.cwnd / 2);
      state.cwnd = state.ssthresh + 3 * MAX_SEGMENT_SIZE;
      console.log("Triple duplicate ACK received. Switching to Fast Recovery");
      return new FastRecovery();
    }
    state.dupAckCount = 0;
    state.cwnd += byteCount;
    if (state.cwnd >= state.ssthresh) {
      console.log(
        "Reached the Slow Start Threshold. Switching to Congestion Avoidance",
      );
      return new CongestionAvoidance();
    }
    return this;
  }
}

class CongestionAvoidance {
  handleAck(
    state: CongestionControlState,
    byteCount: number,
  ): CongestionControlStateBehavior {
    if (byteCount === 0) {
      // Duplicate ACK
      state.dupAckCount++;
      if (state.dupAckCount === 3) {
        return this;
      }
      state.ssthresh = Math.floor(state.cwnd / 2);
      state.cwnd = state.ssthresh + 3 * MAX_SEGMENT_SIZE;
      console.log("Triple duplicate ACK received. Switching to Fast Recovery");
      return new FastRecovery();
    }
    state.dupAckCount = 0;
    state.cwnd += (byteCount * MAX_SEGMENT_SIZE) / state.cwnd;
    return this;
  }
}

class FastRecovery {
  handleAck(
    state: CongestionControlState,
    byteCount: number,
  ): CongestionControlStateBehavior {
    if (byteCount === 0) {
      // Duplicate ACK
      state.cwnd += MAX_SEGMENT_SIZE;
      return this;
    }
    state.cwnd = state.ssthresh;
    console.log("Fast recovery finished. Switching to Congestion Avoidance");
    return new CongestionAvoidance();
  }
}

// Weight for the latest RTT sample when estimating the RTT.
// The recommended value is 1/8
const RTT_SAMPLE_WEIGHT = 0.125;
// Weight for the latest sample when estimating the deviation.
// The recommended value is 1/4
const DEV_SAMPLE_WEIGHT = 0.25;

class RTTEstimator {
  private ctx: GlobalContext;
  // Estimated Round Trip Time
  // Initially set to 20 seconds
  private estimatedRTT = 60 * 1000;
  private devRTT = 0;

  private measuring = false;
  private currentSample = {
    seqNum: 0,
    rtt: 0,
  };

  constructor(ctx: GlobalContext) {
    this.ctx = ctx;
  }

  getRtt() {
    return this.estimatedRTT + 4 * this.devRTT;
  }

  startMeasurement(seqNum: number) {
    if (this.measuring) {
      return;
    }
    // Start measuring the RTT for the segment
    this.currentSample.rtt = 0;
    this.currentSample.seqNum = seqNum;
    this.measuring = true;
    Ticker.shared.add(this.measureTick, this);
  }

  finishMeasurement(ackNum: number) {
    if (!this.measuring || ackNum < this.currentSample.seqNum) {
      // Ignore the ACK
      return;
    }
    // Stop measuring the RTT for the segment
    this.measuring = false;
    Ticker.shared.remove(this.measureTick, this);

    // Update the estimated RTT and deviation
    const sampleRTT = this.currentSample.rtt;

    this.estimatedRTT =
      (1 - RTT_SAMPLE_WEIGHT) * this.estimatedRTT +
      RTT_SAMPLE_WEIGHT * sampleRTT;

    this.devRTT =
      (1 - DEV_SAMPLE_WEIGHT) * this.devRTT +
      DEV_SAMPLE_WEIGHT * Math.abs(sampleRTT - this.estimatedRTT);
  }

  discardMeasurement(seqNum: number) {
    if (!this.measuring || seqNum !== this.currentSample.seqNum) {
      return;
    }
    // Stop measuring the RTT for the segment
    this.measuring = false;
    Ticker.shared.remove(this.measureTick, this);
  }

  private measureTick(ticker: Ticker) {
    // Update the current sample's RTT
    // NOTE: we do this to account for the simulation's speed
    this.currentSample.rtt += ticker.elapsedMS * this.ctx.getCurrentSpeed();
  }
}
