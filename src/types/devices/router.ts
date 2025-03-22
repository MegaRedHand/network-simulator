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

  private processingProgress = 0;
  // Time in ms to process a single byte
  private timePerByte = 5;

  private packetQueue: IPv4Packet[] = [];
  private packetQueueSizeBytes = 0;
  private maxQueueSizeBytes = 512;

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
    if (this.packetQueueSizeBytes >= this.maxQueueSizeBytes) {
      console.debug("Packet queue full, dropping packet");
      return;
    }
    this.packetQueue.push(datagram);
    const oldQueueSize = this.packetQueueSizeBytes;
    this.packetQueueSizeBytes += datagram.totalLength;
    // Start packet processor if not already running
    if (oldQueueSize === 0) {
      Ticker.shared.add(this.processPacket, this);
    }
  }

  processPacket(ticker: Ticker) {
    this.processingProgress += ticker.deltaMS;
    const packetLength = this.packetQueue[0].totalLength;
    const progressNeeded = this.timePerByte * packetLength;
    if (this.processingProgress < progressNeeded) {
      return;
    }
    this.processingProgress -= progressNeeded;
    const datagram = this.packetQueue.shift();
    this.packetQueueSizeBytes -= packetLength;
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
    if (this.packetQueueSizeBytes === 0) {
      Ticker.shared.remove(this.processPacket, this);
      this.processingProgress = 0;
      return;
    }
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
  private maxQueueSizeBytes = 512;

  enqueue(packet: IPv4Packet) {
    if (this.queueSizeBytes >= this.maxQueueSizeBytes) {
      return false;
    }
    this.queue.push(packet);
    this.queueSizeBytes += packet.totalLength;
    return true;
  }

  unqueue(): IPv4Packet | undefined {
    if (this.queue.length === 0) {
      return;
    }
    const packet = this.queue.shift();
    this.queueSizeBytes -= packet.totalLength;
    return packet;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
