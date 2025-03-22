import { DeviceType, Layer } from "./device";
import { NetworkDevice } from "./networkDevice";
import { ViewGraph } from "../graphs/viewgraph";
import RouterImage from "../../assets/router.svg";
import { Position } from "../common";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DeviceId, isRouter } from "../graphs/datagraph";
import { Texture, Ticker } from "pixi.js";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { GlobalContext } from "../../context";
import { sendRawPacket } from "../packet";

export class Router extends NetworkDevice {
  static DEVICE_TEXTURE: Texture;

  private packetQueue = new PacketQueue(512);
  // Time in ms to process a single byte
  private timePerByte = 5;
  // Number of bytes processed
  private bytesProcessed = 0;

  static getTexture() {
    if (!Router.DEVICE_TEXTURE) {
      Router.DEVICE_TEXTURE = Texture.from(RouterImage);
    }
    return Router.DEVICE_TEXTURE;
  }

  constructor(
    id: DeviceId,
    viewgraph: ViewGraph,
    ctx: GlobalContext,
    position: Position,
    mac: MacAddress,
    ip: IpAddress,
    mask: IpAddress,
  ) {
    super(id, Router.getTexture(), viewgraph, ctx, position, mac, ip, mask);
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    info.addField("IP Address", this.ip.octets.join("."));
    info.addEmptySpace();

    info.addRoutingTable(this.viewgraph, this.id);

    RightBar.getInstance().renderInfo(info);
  }

  getLayer(): Layer {
    return Layer.Network;
  }

  getType(): DeviceType {
    return DeviceType.Router;
  }

  receiveDatagram(datagram: IPv4Packet) {
    if (this.ip.equals(datagram.destinationAddress)) {
      this.handlePacket(datagram);
      return;
    }
    this.addPacketToQueue(datagram);
  }

  addPacketToQueue(datagram: IPv4Packet) {
    const wasEmpty = this.packetQueue.isEmpty();
    if (!this.packetQueue.enqueue(datagram)) {
      console.debug("Packet queue full, dropping packet");
      return;
    }
    // Start packet processor if not already running
    if (wasEmpty) {
      Ticker.shared.add(this.processPacket, this);
    }
  }

  processPacket(ticker: Ticker) {
    const datagram = this.getPacketsToProcess(ticker.deltaMS);
    if (!datagram) {
      return;
    }
    const devices = this.routePacket(datagram);

    if (!devices || devices.length === 0) {
      return;
    }
    for (const nextHopId of devices) {
      // Wrap the datagram in a new frame
      const nextHop = this.viewgraph.getDevice(nextHopId);
      if (!nextHop) {
        console.error("Next hop not found");
        continue;
      }
      const newFrame = new EthernetFrame(this.mac, nextHop.mac, datagram);
      sendRawPacket(this.viewgraph, this.id, newFrame);
    }

    // Stop processing packets if queue is empty
    if (this.packetQueue.isEmpty()) {
      Ticker.shared.remove(this.processPacket, this);
      this.bytesProcessed = 0;
      return;
    }
  }

  getPacketsToProcess(timeMs: number): IPv4Packet | null {
    this.bytesProcessed += timeMs;
    const packetLength = this.packetQueue.getHead()?.totalLength;
    const progressNeeded = this.timePerByte * packetLength;
    if (this.bytesProcessed < progressNeeded) {
      return null;
    }
    this.bytesProcessed -= progressNeeded;
    return this.packetQueue.dequeue();
  }

  routePacket(datagram: IPv4Packet): DeviceId[] {
    const device = this.viewgraph.getDataGraph().getDevice(this.id);
    if (!device || !isRouter(device)) {
      return;
    }

    const result = device.routingTable.find((entry) => {
      if (entry.deleted) {
        console.debug("Skipping deleted entry:", entry);
        return false;
      }
      const ip = IpAddress.parse(entry.ip);
      const mask = IpAddress.parse(entry.mask);
      console.debug("Considering entry:", entry);
      return datagram.destinationAddress.isInSubnet(ip, mask);
    });

    if (!result) {
      console.warn("No route found for", datagram.destinationAddress);
      return [];
    }

    const devices = this.viewgraph
      .getDataGraph()
      .getConnectionsInInterface(this.id, result.iface);

    if (!devices) {
      console.error("Current device doesn't exist!", this.id);
      return [];
    }

    return devices;
  }
}

class PacketQueue {
  private queue: IPv4Packet[] = [];
  private queueSizeBytes = 0;
  private maxQueueSizeBytes: number;

  constructor(maxQueueSizeBytes: number) {
    this.maxQueueSizeBytes = maxQueueSizeBytes;
  }

  enqueue(packet: IPv4Packet) {
    if (this.queueSizeBytes >= this.maxQueueSizeBytes) {
      return false;
    }
    this.queue.push(packet);
    this.queueSizeBytes += packet.totalLength;
    return true;
  }

  dequeue(): IPv4Packet | undefined {
    if (this.queue.length === 0) {
      return;
    }
    const packet = this.queue.shift();
    this.queueSizeBytes -= packet.totalLength;
    return packet;
  }

  getHead(): IPv4Packet | undefined {
    return this.queue[0];
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
