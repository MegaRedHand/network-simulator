import { EthernetFrame } from "../../packets/ethernet";
import { IpAddress, IpPayload, IPv4Packet } from "../../packets/ip";
import { Flags, TcpSegment } from "../../packets/tcp";
import { sendViewPacket } from "../packet";
import { ViewHost } from "../view-devices";
import { ViewNetworkDevice } from "../view-devices/vNetworkDevice";
import { AsyncQueue } from "./asyncQueue";

type Port = number;

interface IpAndPort {
  ip: IpAddress;
  port: Port;
}

interface SegmentWithIp {
  srcIp: IpAddress;
  segment: TcpSegment;
}

// Key used in tcpQueues to match all IPs and ports.
// This is used when no filter is provided.
const MATCH_ALL_KEY = ["*", "*"].toString();

// Port number to start at when auto-assigning ports.
const STARTING_PORT: Port = 51686;
const MAX_PORT: Port = 65535;

export class TcpModule {
  private host: ViewHost;

  // Key is the host port.
  // Value is [dstIp, dstPort] tuple.
  // NOTE: MATCH_ALL_KEY is used to match all IPs and ports.
  private tcpQueues = new Map<Port, Map<string, AsyncQueue<SegmentWithIp>>>();

  constructor(host: ViewHost) {
    this.host = host;
  }

  handleSegment(srcIp: IpAddress, segment: TcpSegment) {
    const queueMap = this.tcpQueues.get(segment.destinationPort);
    if (!queueMap) {
      console.warn("port not in use");
      return;
    }
    const key = [srcIp, segment.sourcePort].toString();
    let queue = queueMap.get(key);
    if (!queue) {
      console.debug("defaulting to match-all queue");
      queue = queueMap.get(MATCH_ALL_KEY);
    }
    if (!queue) {
      console.warn("no handler registered");
      return;
    }
    queue.push({ srcIp, segment });
  }

  async connect(dstHost: ViewHost, dstPort: Port) {
    const flags = new Flags().withSyn();
    const srcPort: Port = this.getNextPortNumber();
    const seqNum = getInitialSeqNumber();
    const synSegment = new TcpSegment(
      srcPort,
      dstPort,
      seqNum,
      0,
      flags,
      new Uint8Array(),
    );
    // Send SYN
    sendIpPacket(this.host, dstHost, synSegment);

    // Receive SYN-ACK
    // TODO: check packet is valid response
    const filter = { ip: dstHost.ip, port: dstPort };
    const tcpQueue = this.initNewQueue(srcPort, filter);

    // TODO: validate response
    await tcpQueue.pop();

    const ackFlags = new Flags().withAck();

    // Send ACK
    const ackSegment = new TcpSegment(
      srcPort,
      dstPort,
      0,
      0,
      ackFlags,
      new Uint8Array(),
    );
    sendIpPacket(this.host, dstHost, ackSegment);

    return new TcpSocket(this.host, srcPort, dstHost, dstPort, tcpQueue);
  }

  async listenOn(port: Port): Promise<TcpListener | null> {
    const queue = this.initNewQueue(port);
    if (!queue) {
      return null;
    }
    return new TcpListener(this, this.host, port, queue);
  }

  /**
   * Register a handler for TCP segments received on the given port.
   * @param port port to accept packets in.
   * @param filter optional filter for IP and port. If not provided, all IPs and ports are accepted.
   * @returns a promise that resolves with the received TCP segment
   */
  initNewQueue(port: Port, filter?: IpAndPort) {
    let handlerMap = this.tcpQueues.get(port);
    if (!handlerMap) {
      handlerMap = new Map<string, AsyncQueue<SegmentWithIp>>();
      this.tcpQueues.set(port, handlerMap);
    }
    const key = filter ? [filter.ip, filter.port].toString() : MATCH_ALL_KEY;
    const prevHandler = handlerMap.get(key);
    if (prevHandler) {
      return null;
    }
    const queue = new AsyncQueue<SegmentWithIp>();
    handlerMap.set(key, queue);
    return queue;
  }

  // Port number to use for the next connection.
  // The number is arbitrary
  private nextPortNumber: Port = STARTING_PORT;

  private getNextPortNumber() {
    // To avoid infinite loops
    let tries = MAX_PORT - STARTING_PORT;
    let port: Port;
    do {
      port = this.nextPortNumber++;
      if (this.nextPortNumber > MAX_PORT) {
        this.nextPortNumber = STARTING_PORT;
      }
    } while (this.tcpQueues.has(port) && tries-- > 0);

    if (this.tcpQueues.has(port)) {
      throw new Error("No available ports");
    }
    return port;
  }
}

const MAX_BUFFER_SIZE = 0xffff;

export class TcpSocket {
  private srcHost: ViewHost;
  private srcPort: Port;

  private dstHost: ViewHost;
  private dstPort: Port;

  private tcpQueue: AsyncQueue<SegmentWithIp>;
  private readClosed = false;
  private writeClosed = false;

  private readBuffer = new Uint8Array(MAX_BUFFER_SIZE);
  private bufferLength = 0;

  constructor(
    srcHost: ViewHost,
    srcPort: Port,
    dstHost: ViewHost,
    dstPort: Port,
    tcpQueue: AsyncQueue<SegmentWithIp>,
  ) {
    this.srcHost = srcHost;
    this.dstHost = dstHost;
    this.srcPort = srcPort;
    this.dstPort = dstPort;
    this.tcpQueue = tcpQueue;
  }

  /**
   * Reads data from the connection into the given buffer.
   * This reads enough data to fill the buffer, but may read
   * less in case the connection is closed.
   * @param buffer to copy the contents to
   * @returns the number of bytes read
   */
  async read(buffer: Uint8Array) {
    // While we don't have data, wait for more packets
    while (this.bufferLength < buffer.length && !this.readClosed) {
      const { segment } = await this.tcpQueue.pop();
      // TODO: validate payload
      const data = segment.data;
      const newLength = this.bufferLength + data.length;
      if (newLength > MAX_BUFFER_SIZE) {
        throw new Error("Buffer overflow");
      }
      this.readBuffer.set(data, this.bufferLength);
      this.bufferLength = newLength;

      // If segment has FIN, the connection was closed
      if (segment.flags.fin) {
        this.readClosed = true;
        break;
      }
    }
    // Copy partially if connection was closed, if not, fill the buffer
    const readLength = Math.min(this.bufferLength, buffer.length);
    if (readLength === 0) {
      if (this.readClosed) {
        console.error("tried to read from a closed socket");
        return -1;
      }
      return 0;
    }
    // Copy the data to the buffer
    buffer.set(this.readBuffer.subarray(0, readLength));
    this.readBuffer.copyWithin(0, readLength + 1, this.bufferLength);
    this.bufferLength -= readLength;
    return readLength;
  }

  async write(content: Uint8Array) {
    if (this.writeClosed) {
      console.error("tried to write to a closed socket");
      return -1;
    }
    // TODO: split content in multiple segments
    const contentLength = content.length;
    // TODO: use correct ACK numbers
    const segment = new TcpSegment(
      this.srcPort,
      this.dstPort,
      0,
      0,
      new Flags().withAck(),
      content,
    );
    sendIpPacket(this.srcHost, this.dstHost, segment);
    return contentLength;
  }

  closeWrite() {
    this.writeClosed = true;
    const segment = new TcpSegment(
      this.srcPort,
      this.dstPort,
      0,
      0,
      new Flags().withFin().withAck(),
      new Uint8Array(),
    );
    sendIpPacket(this.srcHost, this.dstHost, segment);
  }
}

export class TcpListener {
  private tcpModule: TcpModule;
  private tcpQueue: AsyncQueue<SegmentWithIp>;
  private host: ViewHost;
  private port: Port;

  constructor(
    tcpModule: TcpModule,
    host: ViewHost,
    port: Port,
    tcpQueue: AsyncQueue<SegmentWithIp>,
  ) {
    this.tcpModule = tcpModule;
    this.host = host;
    this.port = port;
    this.tcpQueue = tcpQueue;
  }

  async next(): Promise<TcpSocket> {
    const { segment, srcIp } = await this.tcpQueue.pop();

    // TODO: validate segment

    // Send SYN-ACK
    const seqNum = getInitialSeqNumber();
    const ackSegment = new TcpSegment(
      this.port,
      segment.sourcePort,
      seqNum,
      segment.sequenceNumber,
      new Flags().withSyn().withAck(),
      new Uint8Array(),
    );
    const dst = this.host.viewgraph.getDeviceByIP(srcIp);
    if (!dst || !(dst instanceof ViewHost)) {
      console.warn("sender device not found or not a host");
      // Wait for next packet
      return this.next();
    }
    sendIpPacket(this.host, dst, ackSegment);

    const ipAndPort = { ip: srcIp, port: segment.sourcePort };
    const queue = this.tcpModule.initNewQueue(this.port, ipAndPort);

    return new TcpSocket(this.host, this.port, dst, segment.sourcePort, queue);
  }
}

// TODO: add overflow checks
class TcpState {
  private srcPort: Port;
  private dstPort: Port;

  // Buffer of data received
  private readBuffer = new BytesBuffer(MAX_BUFFER_SIZE);
  private readClosed = false;

  // Buffer of data to be sent
  private writeBuffer = new BytesBuffer(MAX_BUFFER_SIZE);
  private writeClosed = false;

  // See https://datatracker.ietf.org/doc/html/rfc9293#section-3.3.1
  // SND.UNA
  private sendUnacknowledged: number;
  // SND.NXT
  private sendNext: number;
  // SND.WND
  private sendWindow: number;
  // SND.UP
  // private sendUrgentPointer;
  // SND.WL1
  private seqNumForLastWindowUpdate: number;
  // SND.WL2
  private ackNumForLastWindowUpdate: number;
  // ISS
  private initialSendSeqNum;

  // RCV.NXT
  private recvNext: number;
  // RCV.WND
  private recvWindow: number;

  // IRS
  private initialRecvSeqNum: number;

  constructor(srcPort: Port, dstPort: Port) {
    this.srcPort = srcPort;
    this.dstPort = dstPort;
    this.initialSendSeqNum = getInitialSeqNumber();
  }

  processSynAck(segment: TcpSegment) {
    if (!segment.flags.syn || !segment.flags.ack) {
      return false;
    }
    if (segment.acknowledgementNumber !== this.initialSendSeqNum + 1) {
      return false;
    }
  }

  read(output: Uint8Array): number {
    const readLength = this.readBuffer.read(output);
    if (readLength === 0 && this.readClosed) {
      return -1;
    }
    return readLength;
  }

  write(input: Uint8Array): number {
    if (this.writeClosed) {
      throw new Error("write closed");
    }
    return this.writeBuffer.write(input);
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
    if (!this.recvAck(receivedSegment)) {
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
    }

    // If FIN, mark read end as closed
    if (receivedSegment.flags.fin) {
      this.readClosed = true;
    }
    return true;
  }

  nextSegment(): TcpSegment | null {
    const segment = new TcpSegment(
      0,
      0,
      this.seqNum,
      this.ackNum,
      new Flags(),
      new Uint8Array(),
    );
    return segment;
  }

  // utils

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

  private recvAck(segment: TcpSegment) {
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
}

class BytesBuffer {
  private buffer: Uint8Array;
  private length: number;

  constructor(size: number) {
    this.buffer = new Uint8Array(size);
    this.length = 0;
  }

  read(output: Uint8Array): number {
    const readLength = Math.min(this.length, output.length);
    if (readLength == 0) {
      return 0;
    }
    output.set(this.buffer.subarray(0, readLength));
    this.buffer.copyWithin(0, readLength, this.length);
    this.length -= readLength;
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

function getInitialSeqNumber() {
  return Math.floor(Math.random() * 0xffffffff);
}
