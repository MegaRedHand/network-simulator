import { EthernetFrame } from "../../packets/ethernet";
import { IpAddress, IpPayload, IPv4Packet } from "../../packets/ip";
import { Flags, TcpSegment } from "../../packets/tcp";
import { sendViewPacket } from "../packet";
import { ViewHost } from "../view-devices";
import { ViewNetworkDevice } from "../view-devices/vNetworkDevice";
import { AsyncQueue } from "./asyncQueue";
import { TcpState } from "./tcp/tcpState";

type Port = number;

interface IpAndPort {
  ip: IpAddress;
  port: Port;
}

export interface SegmentWithIp {
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
    const srcPort: Port = this.getNextPortNumber();
    const filter = { ip: dstHost.ip, port: dstPort };
    const tcpQueue = this.initNewQueue(srcPort, filter);

    const tcpState = new TcpState(
      this.host,
      srcPort,
      dstHost,
      dstPort,
      tcpQueue,
    );

    const skt = new TcpSocket(tcpState);

    // Retry on failure
    for (let i = 0; i < 3; i++) {
      tcpState.startConnection();
      const response = await tcpQueue.pop();
      const ok = tcpState.recvSynAck(response.segment);
      if (ok) {
        return skt;
      }
    }
    return null;
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
  private tcpState: TcpState;

  constructor(tcpState: TcpState) {
    this.tcpState = tcpState;
  }

  /**
   * Reads data from the connection into the given buffer.
   * This reads enough data to fill the buffer, but may read
   * less in case the connection is closed.
   * @param buffer to copy the contents to
   * @returns the number of bytes read
   */
  async read(buffer: Uint8Array) {
    return this.tcpState.read(buffer);
  }

  async write(content: Uint8Array) {
    return this.tcpState.write(content);
  }

  closeWrite() {
    this.tcpState.closeWrite();
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

    const dst = this.host.viewgraph.getDeviceByIP(srcIp);
    if (!dst || !(dst instanceof ViewHost)) {
      console.warn("sender device not found or not a host");
      // Wait for next packet
      return this.next();
    }
    const ipAndPort = { ip: srcIp, port: segment.sourcePort };
    const queue = this.tcpModule.initNewQueue(this.port, ipAndPort);

    const tcpState = new TcpState(
      this.host,
      this.port,
      dst,
      segment.sourcePort,
      queue,
    );

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
    sendIpPacket(this.host, dst, ackSegment);

    return new TcpSocket(tcpState);
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
