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
import { CONFIG_SWITCH_KEYS } from "../../../config_menu/switches/switch_factory";
import { Layer } from "../../layer";

enum TcpStateEnum {
  CLOSED = 0,
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

enum ProcessingResult {
  SUCCESS = 0,
  DISCARD = 1,
  POSTPONE = 2,
  RESET = 3,
}

const MAX_BUFFER_SIZE = 0xffff;
const MAX_SEGMENT_SIZE = 1460;
const u32_MODULUS = 0x100000000; // 2^32

function getInitialSeqNumber() {
  // For random seqnums use:
  // return Math.floor(Math.random() * 0xffffffff);
  return 0;
}

function sendIpPacket(
  src: ViewHost,
  dst: ViewHost,
  payload: IpPayload,
): boolean {
  const viewgraph = src.viewgraph;

  const forwardingData = ViewNetworkDevice.getForwardingData(
    src.id,
    dst.id,
    viewgraph,
  );
  if (!forwardingData) {
    console.warn(`Device ${dst.id} is not reachable from device ${src.id}`);
    return false;
  }
  const [srcData, nextHopData, dstData, sendingIface] = [
    forwardingData.src,
    forwardingData.nextHop,
    forwardingData.dst,
    forwardingData.sendingIface,
  ];

  // Resolve next hop MAC address
  const nextHopMac = src.resolveAddress(nextHopData.ip);
  if (!nextHopMac || !nextHopMac.mac) {
    console.debug(
      `Device ${src.id} couldn't resolve next hop MAC address for device with IP ${nextHopData.ip.toString()}. Program cancelled`,
    );
  }

  const ipPacket = new IPv4Packet(srcData.ip, dstData.ip, payload);
  const frame = new EthernetFrame(srcData.mac, nextHopData.mac, ipPacket);

  sendViewPacket(src.viewgraph, src.id, frame, sendingIface);
  return true;
}

enum Command {
  ABORT,
  SEND_ACK,
}

export class TcpState {
  private ctx: GlobalContext;
  private srcHost: ViewHost;
  private srcPort: Port;
  private dstHost: ViewHost;
  private dstPort: Port;
  private tcpQueue: AsyncQueue<SegmentWithIp>;
  private cmdQueue = new AsyncQueue<Command>();
  private connectionQueue = new AsyncQueue<boolean>();
  private retransmissionQueue: RetransmissionQueue;

  private recvQueue = new ReceivedSegmentsQueue();

  // Buffer of data received
  private readBuffer = new BytesBuffer(MAX_BUFFER_SIZE);
  private readChannel = new AsyncQueue<number>();
  private readClosedSeqnum = -1;
  private readClosed = false;

  // Buffer of data to be sent
  private writeBuffer = new BytesBuffer(MAX_BUFFER_SIZE);
  private writeChannel = new AsyncQueue<number>();
  private writeClosedSeqnum = -1;
  private writeClosed = false;

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
  private congestionControl: CongestionControl;

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

    this.congestionControl = new CongestionControl(
      this.srcHost.ctx
        .getConfigMenu()
        .getConfigSwitchValue(CONFIG_SWITCH_KEYS.USE_TCP_RENO),
    );

    this.mainLoop();
  }

  // Open active connection
  async connect(): Promise<boolean> {
    // Initialize the TCB
    this.initialSendSeqNum = getInitialSeqNumber();
    this.sendNext = (this.initialSendSeqNum + 1) % u32_MODULUS;
    this.sendUnacknowledged = this.initialSendSeqNum;

    // Send a SYN
    if (!this.sendSynSegment()) {
      return false;
    }

    // Move to SYN_SENT state
    this.state = TcpStateEnum.SYN_SENT;
    // NOTE: according to the RFC, we should return immediately,
    // but here we wait for the connection to be established.
    // This is done to make visualizations easier.
    return await this.connectionQueue.pop();
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
    if (!this.sendSynSegment()) {
      return false;
    }
    this.rttEstimator.startMeasurement(this.initialSendSeqNum);
    return true;
  }

  // Reset the TCP connection in response to an unexpected segment
  static handleUnexpectedSegment(
    srcHost: ViewHost,
    srcPort: Port,
    dstHost: ViewHost,
    dstPort: Port,
    segment: TcpSegment,
  ) {
    // An incoming segment containing a RST is discarded
    if (segment.flags.rst) {
      return;
    }
    // An incoming segment not containing a RST causes a RST to be sent in response
    let resetSegment;
    if (segment.flags.ack) {
      // <SEQ=SEG.ACK><CTL=RST>
      const flags = new Flags().withRst();
      const segAck = segment.acknowledgementNumber;

      resetSegment = new TcpSegment(srcPort, dstPort, segAck, 0);
      resetSegment.withFlags(flags);
    } else {
      // <SEQ=0><ACK=SEG.SEQ+SEG.LEN><CTL=RST,ACK>
      const flags = new Flags().withRst().withAck();
      const flagsLength =
        (segment.flags.syn ? 1 : 0) + (segment.flags.fin ? 1 : 0);
      const ackNum = segment.sequenceNumber + segment.data.length + flagsLength;

      resetSegment = new TcpSegment(srcPort, dstPort, 0, ackNum);
      resetSegment.withFlags(flags);
    }
    sendIpPacket(srcHost, dstHost, resetSegment);

    const srcInterface = srcHost.interfaces[0];
    const dstInterface = dstHost.interfaces[0];

    // Drop the segment
    const packet = new IPv4Packet(srcInterface.ip, dstInterface.ip, segment);
    const frame = new EthernetFrame(srcInterface.mac, dstInterface.mac, packet);
    dropPacket(srcHost.viewgraph, srcHost.id, frame);
  }

  private handleSegment(segment: TcpSegment): ProcessingResult {
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
            return ProcessingResult.DISCARD;
          }
          console.debug("Invalid SYN_SENT ACK, sending RST");
          // Send a RST segment
          const newSegment = this.newSegment(ack, 0);
          newSegment.withFlags(new Flags().withRst());
          sendIpPacket(this.srcHost, this.dstHost, newSegment);
          return ProcessingResult.DISCARD;
        }
        // Try to process ACK
        if (!this.isAckValid(segment.acknowledgementNumber)) {
          console.debug("Invalid SYN_SENT ACK");
          return ProcessingResult.DISCARD;
        }
      }
      if (flags.rst) {
        if (flags.ack) {
          // drop the segment, enter CLOSED state, delete TCB, and return
          console.debug("connection reset");
          this.connectionQueue.push(false);
          return ProcessingResult.RESET;
        } else {
          console.debug("SYN_SENT RST without ACK, dropping segment");
          return ProcessingResult.DISCARD;
        }
      }
      if (flags.syn) {
        this.recvNext = (segment.sequenceNumber + 1) % u32_MODULUS;
        this.initialRecvSeqNum = segment.sequenceNumber;
        if (flags.ack) {
          this.sendUnacknowledged = segment.acknowledgementNumber;
          // It's a valid SYN-ACK
          // Process the segment normally
          this.state = TcpStateEnum.ESTABLISHED;
          this.connectionQueue.push(true);
          this.retransmissionQueue.ack(segment.acknowledgementNumber);
          if (this.handleSegmentData(segment) !== ProcessingResult.SUCCESS) {
            console.debug("Segment data processing failed");
            return ProcessingResult.DISCARD;
          }
          return ProcessingResult.SUCCESS;
        } else {
          // It's a SYN
          if (segment.data.length > 0) {
            throw new Error("SYN segment with data not supported");
          }
          this.sendWindow = segment.window;
          this.seqNumForLastWindowUpdate = segment.sequenceNumber;
          this.ackNumForLastWindowUpdate = segment.acknowledgementNumber;
          // Send SYN-ACK
          const newSegment = this.newSegment(
            this.initialSendSeqNum,
            this.recvNext,
          );
          newSegment.withFlags(new Flags().withSyn().withAck());
          sendIpPacket(this.srcHost, this.dstHost, newSegment);
          this.state = TcpStateEnum.SYN_RECEIVED;
        }
      }
      if (!(flags.rst || flags.syn)) {
        console.debug("SYN_SENT segment without SYN or RST");
        return ProcessingResult.DISCARD;
      }
      return ProcessingResult.SUCCESS;
    }
    // Check the sequence number is valid
    const segSeq = segment.sequenceNumber;
    const segLen = segment.data.length;
    if (!this.isSeqNumValid(segSeq, segLen)) {
      console.debug("Sequence number not valid");

      // RFC 5961 suggests sending a challenge ACK, but here we keep things simple
      // If RST is not set, send an ACK in response
      if (!flags.rst) {
        this.notifySendPackets();
      }
      return ProcessingResult.DISCARD;
    }

    if (flags.rst) {
      if (!this.isInReceiveWindow(segSeq)) {
        console.debug("RST SEQ outside receive window");
        return ProcessingResult.DISCARD;
      } else if (segSeq === this.recvNext) {
        console.debug("RST SEQ matches recvNext, resetting connection");
        return ProcessingResult.RESET;
      } else {
        // Send a challenge segment and discard the packet
        const challengeSegment = this.newSegment(this.sendNext, this.recvNext);
        challengeSegment.withFlags(new Flags().withAck());
        sendIpPacket(this.srcHost, this.dstHost, challengeSegment);
        return ProcessingResult.DISCARD;
      }
    }
    if (flags.syn) {
      // TODO: handle SYN flags
      console.debug("SYN flag not supported");
      return ProcessingResult.DISCARD;
    }

    // If the ACK bit is off, drop the segment.
    if (!flags.ack) {
      console.debug("ACK bit is off, dropping segment");
      return ProcessingResult.DISCARD;
    }
    if (this.state === TcpStateEnum.SYN_RECEIVED) {
      if (!this.isAckValid(segment.acknowledgementNumber)) {
        console.debug("ACK invalid, dropping segment");
        const newSegment = this.newSegment(segment.acknowledgementNumber, 0);
        newSegment.withFlags(new Flags().withRst());
        sendIpPacket(this.srcHost, this.dstHost, newSegment);
        return ProcessingResult.DISCARD;
      }
      this.state = TcpStateEnum.ESTABLISHED;
      this.connectionQueue.push(true);
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
        return ProcessingResult.DISCARD;
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
    const result = this.handleSegmentData(segment);
    if (result === ProcessingResult.DISCARD) {
      console.debug("Segment data processing failed, dropping segment");
      return result;
    } else if (result === ProcessingResult.POSTPONE) {
      console.debug("Segment data processing postponed");
      return result;
    }

    if (flags.fin) {
      this.readClosedSeqnum = this.recvNext;
      this.recvNext = (this.recvNext + 1) % u32_MODULUS;
      this.readClosed = true;
      this.readChannel.push(0);
      this.notifySendPackets();
    }

    return ProcessingResult.SUCCESS;
  }

  private dropSegment(segment: TcpSegment) {
    // dummy values
    const [srcIp, srcMac, dstIp, dstMac] = [
      this.srcHost.interfaces[0].ip,
      this.srcHost.interfaces[0].mac,
      this.dstHost.interfaces[0].ip,
      this.dstHost.interfaces[0].mac,
    ];
    const packet = new IPv4Packet(srcIp, dstIp, segment);
    const frame = new EthernetFrame(srcMac, dstMac, packet);
    dropPacket(this.srcHost.viewgraph, this.srcHost.id, frame);
  }

  private handleSegmentData(segment: TcpSegment): ProcessingResult {
    const seqNum = segment.flags.syn
      ? (segment.sequenceNumber + 1) % u32_MODULUS
      : segment.sequenceNumber;
    if (seqNum > this.recvNext) {
      // Send a possibly duplicate ACK
      this.notifySendPackets();
      // Postpone the segment
      return ProcessingResult.POSTPONE;
    } else if (seqNum < this.recvNext) {
      // Drop the segment
      return ProcessingResult.DISCARD;
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
    return ProcessingResult.SUCCESS;
  }

  async read(output: Uint8Array): Promise<number> {
    // Wait for there to be data in the read buffer
    while (this.readBuffer.isEmpty() && !this.readClosed) {
      const available = await this.readChannel.pop();
      if (available === -1) {
        // Connection was reset
        return -1;
      }
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
        const available = await this.writeChannel.pop();
        if (available === -1) {
          // Connection was reset
          return -1;
        }
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

  abort() {
    this.cmdQueue.push(Command.ABORT);
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

    if (ackNum === this.writeClosedSeqnum + 1) {
      this.writeClosed = true;
    }

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
      () => this.cmdQueue.push(Command.SEND_ACK),
      10 * this.ctx.getCurrentSpeed(),
    );
  }

  private async mainLoop() {
    let lastAcked = this.sendUnacknowledged;

    let recheckPromise = this.cmdQueue.pop();
    let receivedSegmentPromise = this.tcpQueue.pop();
    let retransmitPromise = this.retransmissionQueue.pop();

    while (
      !this.readClosed ||
      !this.writeClosed ||
      // This ensures we send the last ACK
      lastAcked !== this.readClosedSeqnum + 1
    ) {
      const result = await Promise.race([
        recheckPromise,
        receivedSegmentPromise,
        retransmitPromise,
      ]);

      if (result === Command.SEND_ACK) {
        console.debug("[" + this.srcHost.id + "] [TCP] Processing SEND_ACK");
        recheckPromise = this.cmdQueue.pop();
        this.notifiedSendPackets = false;
      } else if (result === Command.ABORT) {
        console.debug("[" + this.srcHost.id + "] [TCP] Processing ABORT");
        // Send RST and quit
        const segment = this.newSegment(this.sendNext, 0);
        segment.withFlags(new Flags().withRst());
        sendIpPacket(this.srcHost, this.dstHost, segment);
        break;
      } else if (result === "SYN") {
        // Retransmit SYN packet
        console.debug("[" + this.srcHost.id + "] [TCP] Processing SYN timeout");
        retransmitPromise = this.retransmissionQueue.pop();
        this.sendSynSegment();
        this.showTimeoutIcon();
        continue;
      } else if ("segment" in result) {
        console.debug("[" + this.srcHost.id + "] [TCP] Processing segments");
        receivedSegmentPromise = this.tcpQueue.pop();
        let segment = result.segment;

        let processingResult = this.handleSegment(segment);

        if (processingResult === ProcessingResult.DISCARD) {
          this.dropSegment(segment);
          continue;
        }

        while (
          (processingResult === ProcessingResult.DISCARD ||
            processingResult === ProcessingResult.SUCCESS) &&
          !this.recvQueue.isEmpty()
        ) {
          segment = this.recvQueue.dequeue();
          processingResult = this.handleSegment(segment);
          if (processingResult === ProcessingResult.DISCARD) {
            this.dropSegment(segment);
          }
        }

        if (processingResult === ProcessingResult.POSTPONE) {
          // Enqueue the segment for later processing
          this.recvQueue.enqueue(segment);
        } else if (processingResult === ProcessingResult.RESET) {
          // Reset the connection
          this.dropSegment(segment);
          break;
        }
        continue;
      } else if ("seqNum" in result) {
        console.debug("[" + this.srcHost.id + "] [TCP] Processing timeout");
        retransmitPromise = this.retransmissionQueue.pop();
        // Retransmit the segment
        this.resendPacket(result.seqNum, result.size);
        this.showTimeoutIcon();
        this.congestionControl.notifyTimeout();
        continue;
      }

      const segment = this.newSegment(this.sendNext, this.recvNext).withFlags(
        new Flags().withAck(),
      );
      lastAcked = this.recvNext;

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
      console.debug("[" + this.srcHost.id + "] [TCP] sending segment", segment);

      // Ignore failed sends
      if (sendIpPacket(this.srcHost, this.dstHost, segment)) {
        this.rttEstimator.startMeasurement(segment.sequenceNumber);
      }
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
    this.abortConnection();
  }

  // Closes the connection and notifies reads/writes of this
  private abortConnection() {
    this.state = TcpStateEnum.CLOSED;
    this.readClosed = true;
    this.writeClosed = true;
    this.writeChannel.push(-1);
    this.readChannel.push(-1);
    this.tcpQueue.close();
  }

  /**
   * Sends a SYN or SYN-ACK segment
   */
  private sendSynSegment() {
    let ack = 0;
    const flags = new Flags().withSyn();

    if (this.recvNext) {
      // It's a SYN-ACK
      ack = this.recvNext;
      flags.withAck();
    }
    const segment = this.newSegment(this.initialSendSeqNum, ack);
    segment.withFlags(flags);

    if (!sendIpPacket(this.srcHost, this.dstHost, segment)) {
      console.warn(
        `Device ${this.srcHost.id} couldn't send SYN to device ${this.dstHost.id}.`,
      );
      return false;
    }

    // Add the SYN segment to the retransmission queue
    this.retransmissionQueue.pushSyn();

    // Reset measurement
    this.rttEstimator.restartMeasurement(this.initialSendSeqNum);
    return true;
  }

  private resendPacket(seqNum: number, size: number) {
    if (seqNum === this.initialSendSeqNum && size === 0) {
      // This is the initial SYN segment
    }
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
    // Ignore failed sends
    if (sendIpPacket(this.srcHost, this.dstHost, segment)) {
      this.rttEstimator.discardMeasurement(segment.sequenceNumber);
    }
  }

  private retransmitFirstSegment() {
    // Remove item from the queue
    const item = this.retransmissionQueue.popFirstSegment();
    if (!item) {
      return;
    }
    if (item === "SYN") {
      console.error("SYN segment retransmitted with an established connection");
      return;
    }
    // Resend packet
    this.resendPacket(item.seqNum, item.size);
  }

  private sendWindowSize() {
    const rwnd = this.sendWindow;
    const cwnd = this.congestionControl.getCwnd();

    const windowSize = Math.min(rwnd, cwnd);
    const bytesInFlight = this.sendNext - this.sendUnacknowledged;
    return (windowSize - bytesInFlight) % u32_MODULUS;
  }

  private showTimeoutIcon() {
    this.srcHost.showDeviceIconFor(
      "tcp_timeout",
      "⏰",
      "TCP Timeout",
      2000,
      Layer.Transport,
    );
  }
}

type RetransmissionQueueItem = DataSegment | "SYN";
interface DataSegment {
  seqNum: number;
  size: number;
}

class RetransmissionQueue {
  private timeoutQueue = new AsyncQueue<undefined>();
  private timeoutTick: (t: Ticker) => void = null;
  private itemQueue: RetransmissionQueueItem[] = [];

  private ctx: GlobalContext;
  private rttEstimator: RTTEstimator;

  constructor(ctx: GlobalContext, rttEstimator: RTTEstimator) {
    this.ctx = ctx;
    this.rttEstimator = rttEstimator;
  }

  pushSyn() {
    this.itemQueue.unshift("SYN");
    this.startTimer();
  }

  push(seqNum: number, size: number) {
    const item = { seqNum, size };
    this.itemQueue.push(item);
    this.itemQueue.sort((a, b) => {
      // SYN segments should always be at the front
      if (a === "SYN") {
        return -1;
      }
      if (b === "SYN") {
        return 1;
      }
      return a.seqNum - b.seqNum;
    });

    this.startTimer();
  }

  /**
   * Waits for the timeout to expire and returns the first item in the queue.
   * @returns the first item in the queue
   */
  async pop() {
    await this.timeoutQueue.pop();
    const firstItem = this.itemQueue.shift();
    if (this.itemQueue.length > 0) {
      this.startTimer();
    }
    return firstItem;
  }

  ack(ackNum: number) {
    this.itemQueue = this.itemQueue.filter((item) => {
      // We treat any valid ACK as a SYN ACK
      if (item === "SYN") {
        return false;
      }
      return !(
        item.seqNum < ackNum ||
        (item.seqNum + item.size) % u32_MODULUS <= ackNum
      );
    });
    if (this.itemQueue.length === 0) {
      this.stopTimer();
    }
  }

  popFirstSegment() {
    if (this.itemQueue.length === 0) {
      return;
    }
    const firstSegmentItem = this.itemQueue.shift();
    if (this.itemQueue.length === 0) {
      this.stopTimer();
    }
    return firstSegmentItem;
  }

  private startTimer() {
    if (this.timeoutTick) {
      return;
    }
    let progress = 0;
    const tick = (ticker: Ticker) => {
      progress += ticker.elapsedMS * this.ctx.getCurrentSpeed();
      if (progress >= this.rttEstimator.getRtt()) {
        this.timeoutQueue.push(undefined);
        this.stopTimer();
      }
    };
    this.timeoutTick = tick;
    Ticker.shared.add(this.timeoutTick, this);
  }

  private stopTimer() {
    if (this.timeoutTick) {
      Ticker.shared.remove(this.timeoutTick, this);
      this.timeoutTick = null;
    }
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
  private useFastRecovery: boolean;

  constructor(useFastRecovery: boolean) {
    this.state = {
      cwnd: 1 * MAX_SEGMENT_SIZE,
      ssthresh: Infinity,
      dupAckCount: 0,
    };
    this.stateBehavior = new SlowStart();
    this.useFastRecovery = useFastRecovery;
  }

  getCwnd(): number {
    return this.state.cwnd;
  }

  notifyDupAck(): boolean {
    if (!this.useFastRecovery) {
      this.state.dupAckCount++;
      const isThreeDupAcks = this.state.dupAckCount === 3;
      if (isThreeDupAcks) {
        this.notifyTimeout();
      }
      return isThreeDupAcks;
    }
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

function handleDupAck(
  state: CongestionControlState,
  currentState: CongestionControlStateBehavior,
) {
  state.dupAckCount++;
  if (state.dupAckCount !== 3) {
    return currentState;
  }
  state.ssthresh = Math.floor(state.cwnd / 2);
  state.cwnd = state.ssthresh + 3 * MAX_SEGMENT_SIZE;
  console.log("Triple duplicate ACK received. Switching to Fast Recovery");
  return new FastRecovery();
}

class SlowStart {
  handleAck(
    state: CongestionControlState,
    byteCount: number,
  ): CongestionControlStateBehavior {
    if (byteCount === 0) {
      return handleDupAck(state, this);
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
      return handleDupAck(state, this);
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

  restartMeasurement(seqNum: number) {
    // Restart the measurement for the segment
    this.discardMeasurement(seqNum);
    this.startMeasurement(seqNum);
  }

  private measureTick(ticker: Ticker) {
    // Update the current sample's RTT
    // NOTE: we do this to account for the simulation's speed
    this.currentSample.rtt += ticker.elapsedMS * this.ctx.getCurrentSpeed();
  }
}

class ReceivedSegmentsQueue {
  private queue: TcpSegment[] = [];

  enqueue(segment: TcpSegment) {
    this.queue.push(segment);
    this.queue.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  dequeue(): TcpSegment | undefined {
    return this.queue.shift();
  }

  isEmpty() {
    return this.queue.length === 0;
  }
}
