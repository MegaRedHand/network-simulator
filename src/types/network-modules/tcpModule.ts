import { IpAddress } from "../../packets/ip";
import { TcpSegment } from "../../packets/tcp";
import { ViewHost } from "../view-devices";
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

  async connect(dstHost: ViewHost, dstPort: Port): Promise<TcpSocket | null> {
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
    if (!(await tcpState.connect())) {
      return null;
    }

    return new TcpSocket(tcpState);
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

  closeQueue(port: Port, filter?: IpAndPort) {
    const handlerMap = this.tcpQueues.get(port);
    if (!handlerMap) {
      return;
    }
    const key = filter ? [filter.ip, filter.port].toString() : MATCH_ALL_KEY;
    handlerMap.delete(key);
    if (handlerMap.size === 0) {
      this.tcpQueues.delete(port);
    }
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

export class TcpSocket {
  private tcpState: TcpState;

  constructor(tcpState: TcpState) {
    this.tcpState = tcpState;
  }

  /**
   * Reads data from the connection into the given buffer.
   * This waits until there's a non-zero amount available,
   * or the connection is closed.
   * @param buffer to copy the contents to
   * @returns the number of bytes read
   */
  async read(buffer: Uint8Array) {
    return this.tcpState.read(buffer);
  }

  /**
   * Reads data from the connection into the given buffer.
   * This reads enough data to fill the buffer, but may read
   * less in case the connection is closed.
   * @param buffer to copy the contents to
   * @returns the number of bytes read
   */
  async readAll(buffer: Uint8Array) {
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const read = await this.tcpState.read(buffer.subarray(bytesRead));
      if (read === -1) {
        break;
      }
      bytesRead += read;
    }
    return bytesRead;
  }

  /**
   * Writes data from the given buffer into the connection.
   * This returns immediately, unless the connection is closed
   * or the underlying buffer is full.
   * @param buffer to copy the contents from
   * @returns the number of bytes written
   */
  async write(content: Uint8Array) {
    return await this.tcpState.write(content);
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
    if (!tcpState.accept(segment)) {
      this.tcpModule.closeQueue(this.port, ipAndPort);
      return this.next();
    }

    return new TcpSocket(tcpState);
  }

  close() {
    this.tcpModule.closeQueue(this.port);
  }
}
