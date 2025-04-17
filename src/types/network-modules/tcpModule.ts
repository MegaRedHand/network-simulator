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

const MATCH_ALL_KEY = ["*", "*"].toString();

export class TcpModule {
  private host: ViewHost;

  // Key is the host port.
  // Value is [dstIp, dstPort] tuple.
  // NOTE: MATCH_ALL_KEY is used to match all IPs and ports.
  private tcpQueues = new Map<Port, Map<string, AsyncQueue<TcpSegment>>>();

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
    queue.push(segment);
  }

  async connect(dstHost: ViewHost, dstPort: Port) {
    const flags = new Flags().withSyn();
    // TODO: use random src port
    // TODO: randomize seq num
    const srcPort: Port = Math.floor(Math.random() * (65535 - 1024) + 1024);
    const synSegment = new TcpSegment(
      srcPort,
      dstPort,
      0,
      0,
      flags,
      new Uint8Array(),
    );
    // Send SYN
    sendIpPacket(this.host, dstHost, synSegment);

    // Receive SYN-ACK
    // TODO: check packet is valid response
    const filter = { ip: dstHost.ip, port: dstPort };
    const tcpQueue = this.initQueue(srcPort, filter);

    const responsePacket = await tcpQueue.pop();

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

  async listenOn(port: Port) {
    const queue = this.initQueue(port);
    return new TcpListener(port, queue);
  }

  /**
   * Register a handler for TCP segments received on the given port.
   * @param port port to accept packets in.
   * @param filter optional filter for IP and port. If not provided, all IPs and ports are accepted.
   * @returns a promise that resolves with the received TCP segment
   */
  private initQueue(port: Port, filter?: IpAndPort) {
    let handlerMap = this.tcpQueues.get(port);
    if (!handlerMap) {
      handlerMap = new Map<string, AsyncQueue<TcpSegment>>();
      this.tcpQueues.set(port, handlerMap);
    }
    const key = filter ? [filter.ip, filter.port].toString() : MATCH_ALL_KEY;
    const prevHandler = handlerMap.get(key);
    if (prevHandler) {
      throw new Error("Handler already registered");
    }
    const queue = new AsyncQueue<TcpSegment>();
    handlerMap.set(key, queue);
    return queue;
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

export class TcpSocket {
  private srcHost: ViewHost;
  private srcPort: Port;

  private dstHost: ViewHost;
  private dstPort: Port;

  private tcpQueue: AsyncQueue<TcpSegment>;

  constructor(
    srcHost: ViewHost,
    srcPort: Port,
    dstHost: ViewHost,
    dstPort: Port,
    tcpQueue: AsyncQueue<TcpSegment>,
  ) {
    this.srcHost = srcHost;
    this.dstHost = dstHost;
    this.srcPort = srcPort;
    this.dstPort = dstPort;
    this.tcpQueue = tcpQueue;
  }

  async read(buffer: Uint8Array) {
    return 0;
  }

  async write(content: Uint8Array) {
    return 0;
  }
}

export class TcpListener {
  private tcpQueue: AsyncQueue<TcpSegment>;

  constructor(port: Port, tcpQueue: AsyncQueue<TcpSegment>) {
    this.tcpQueue = tcpQueue;
  }

  async next(): Promise<TcpSocket> {
    const segment = await this.tcpQueue.pop();
    // TODO: validate segment and start connection
    return new TcpSocket(null, 0, null, 0, null);
  }
}
