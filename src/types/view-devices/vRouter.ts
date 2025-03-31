import { DeviceType } from "./vDevice";
import { Layer } from "../layer";
import { ViewNetworkDevice } from "./vNetworkDevice";
import { ViewGraph } from "../graphs/viewgraph";
import RouterImage from "../../assets/router.svg";
import { Position } from "../common";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DeviceId } from "../graphs/datagraph";
import { Texture, Ticker } from "pixi.js";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { GlobalContext } from "../../context";
import { DataRouter } from "../data-devices";
import { dropPacket, sendViewPacket } from "../packet";

export class ViewRouter extends ViewNetworkDevice {
  static DEVICE_TEXTURE: Texture;

  private packetQueue = new PacketQueue(1024);
  // Time in ms to process a single byte
  private timePerByte = 8;
  // Number of bytes processed
  private processingProgress = 0;

  static getTexture() {
    if (!ViewRouter.DEVICE_TEXTURE) {
      ViewRouter.DEVICE_TEXTURE = Texture.from(RouterImage);
    }
    return ViewRouter.DEVICE_TEXTURE;
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
    super(id, ViewRouter.getTexture(), viewgraph, ctx, position, mac, ip, mask);
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
      // dummy values
      const frame = new EthernetFrame(this.mac, this.mac, datagram);
      dropPacket(this.viewgraph, this.id, frame);
      return;
    }
    if (wasEmpty) {
      this.startPacketProcessor();
    }
  }

  processPacket(ticker: Ticker) {
    const elapsedTime = ticker.deltaMS * this.viewgraph.getSpeed();
    const datagram = this.getPacketsToProcess(elapsedTime);
    if (!datagram) {
      return;
    }
    const devices = this.routePacket(datagram);

    if (!devices || devices.length === 0) {
      // dummy values
      const frame = new EthernetFrame(this.mac, this.mac, datagram);
      dropPacket(this.viewgraph, this.id, frame);
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
      sendViewPacket(this.viewgraph, this.id, newFrame);
    }

    if (this.packetQueue.isEmpty()) {
      this.stopPacketProcessor();
    }
  }

  startPacketProcessor() {
    this.processingProgress = 0;
    Ticker.shared.add(this.processPacket, this);
  }

  stopPacketProcessor() {
    this.processingProgress = 0;
    Ticker.shared.remove(this.processPacket, this);
  }

  getPacketsToProcess(timeMs: number): IPv4Packet | null {
    this.processingProgress += timeMs;
    const packetLength = this.packetQueue.getHead()?.totalLength;
    const progressNeeded = this.timePerByte * packetLength;
    if (this.processingProgress < progressNeeded) {
      return null;
    }
    this.processingProgress -= progressNeeded;
    return this.packetQueue.dequeue();
  }

  routePacket(datagram: IPv4Packet): DeviceId[] {
    const device = this.viewgraph.getDataGraph().getDevice(this.id);
    if (!device || !(device instanceof DataRouter)) {
      return;
    }

    const result = device.routingTable.find((entry) => {
      if (entry.deleted) {
        console.debug("Skipping deleted entry:", entry);
        return false;
      }
      const ip = IpAddress.parse(entry.ip);
      const mask = IpAddress.parse(entry.mask);
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
