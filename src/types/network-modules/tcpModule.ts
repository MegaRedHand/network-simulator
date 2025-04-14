import { EthernetFrame } from "../../packets/ethernet";
import { IpAddress, IpPayload, IPv4Packet } from "../../packets/ip";
import { Flags, TcpSegment } from "../../packets/tcp";
import { sendViewPacket } from "../packet";
import { ViewHost } from "../view-devices";
import { ViewNetworkDevice } from "../view-devices/vNetworkDevice";

type Port = number;
type SegmentHandler = (segment: TcpSegment) => void;

export class TcpModule {
  private host: ViewHost;

  // Key is the [srcPort, dstIp, dstPort] tuple.
  // Value is something that ties to the read/write methods
  private segmentHandlers = new Map<Port, Map<string, SegmentHandler>>();

  constructor(host: ViewHost) {
    this.host = host;
  }

  handleSegment(srcIp: IpAddress, segment: TcpSegment) {
    const handlerMap = this.segmentHandlers.get(segment.destinationPort);
    if (!handlerMap) {
      console.warn("port not in use");
      return;
    }
    const key = [srcIp, segment.sourcePort].toString();
    const handle = handlerMap.get(key);
    handle(segment);
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

    const response = await this.registerHandler(srcPort, dstHost.ip, dstPort);

    // Receive SYN-ACK
    const responsePacket = await response;

    const ackFlags = new Flags().withAck();

    // TODO: check packet is valid response

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

    return new TcpSocket(this.host, srcPort, dstHost, dstPort);
  }

  registerHandler(port: Port, otherIp: IpAddress, otherPort: Port) {
    let handlerMap = this.segmentHandlers.get(port);
    if (!handlerMap) {
      handlerMap = new Map<string, SegmentHandler>();
      this.segmentHandlers.set(port, handlerMap);
    }
    const key = [otherIp, otherPort].toString();
    const handler = handlerMap.get(key);
    if (handler) {
      throw new Error("Handler already registered");
    }
    const promise = new Promise<TcpSegment>((resolve) => {
      handlerMap.set(key, resolve);
    });
    return promise;
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

class TcpSocket {
  private srcHost: ViewHost;
  private srcPort: Port;

  private dstHost: ViewHost;
  private dstPort: Port;

  constructor(
    srcHost: ViewHost,
    srcPort: Port,
    dstHost: ViewHost,
    dstPort: Port,
  ) {
    this.srcHost = srcHost;
    this.dstHost = dstHost;
    this.srcPort = srcPort;
    this.dstPort = dstPort;
  }

  async read(buffer: Uint8Array) {
    return 0;
  }

  async write(content: Uint8Array) {
    return 0;
  }
}
