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

  private processingPackets = false;
  private processingProgress = 0;
  // Time in ms to process a single packet
  private timePerPacket = 250;

  private packetQueue: IPv4Packet[] = [];
  // TODO: we should count this in bytes
  private maxQueueSize = 5;

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
    if (this.packetQueue.length >= this.maxQueueSize) {
      console.debug("Packet queue full, dropping packet");
      return;
    }
    this.packetQueue.push(datagram);
    // Start packet processor if not already running
    if (!this.processingPackets) {
      Ticker.shared.add(this.processPacket, this);
      this.processingPackets = true;
    }
  }

  processPacket(ticker: Ticker) {
    this.processingProgress += ticker.deltaMS;
    if (this.processingProgress < this.timePerPacket) {
      return;
    }
    this.processingProgress -= this.timePerPacket;
    const datagram = this.packetQueue.pop();
    const devices = this.routePacket(datagram);

    if (!devices || devices.length === 0) {
      return;
    }
    // TODO: send to all devices in the interface
    const nextHopId = devices[0];
    // Wrap the datagram in a new frame
    const nextHop = this.viewgraph.getDevice(nextHopId);
    if (!nextHop) {
      console.error("Next hop not found");
      return;
    }
    const newFrame = new EthernetFrame(this.mac, nextHop.mac, datagram);
    sendRawPacket(this.viewgraph, this.id, newFrame);

    // Stop processing packets if queue is empty
    if (this.packetQueue.length === 0) {
      Ticker.shared.remove(this.processPacket, this);
      this.processingPackets = false;
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

    return devices;
  }
}
