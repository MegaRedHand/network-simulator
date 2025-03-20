import { DeviceType, Layer } from "./device";
import { NetworkDevice } from "./networkDevice";
import { ViewGraph } from "../graphs/viewgraph";
import RouterImage from "../../assets/router.svg";
import { Position } from "../common";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DeviceId, isRouter } from "../graphs/datagraph";
import { Texture } from "pixi.js";
import { MacAddress } from "../../packets/ethernet";
import { GlobalContext } from "../../context";

export class Router extends NetworkDevice {
  static DEVICE_TEXTURE: Texture;

  private packetQueueSize = 0;
  private maxQueueSize = 5;
  private timePerPacket = 1000;

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

  async routePacket(datagram: IPv4Packet): Promise<DeviceId | null> {
    const device = this.viewgraph.getDataGraph().getDevice(this.id);
    if (!device || !isRouter(device)) {
      return null;
    }
    if (this.packetQueueSize >= this.maxQueueSize) {
      console.debug("Packet queue full, dropping packet");
      return null;
    }
    this.packetQueueSize += 1;
    console.debug("Processing packet, queue size:", this.packetQueueSize);
    await new Promise((resolve) => setTimeout(resolve, this.timePerPacket));
    this.packetQueueSize -= 1;

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
    const devices = this.viewgraph
      .getDataGraph()
      .getConnectionsInInterface(this.id, result.iface);
    if (!devices || devices.length === 0) {
      return null;
    }
    // TODO: return more than one device
    return devices[0];
  }

  async receiveDatagram(datagram: IPv4Packet): Promise<DeviceId | null> {
    if (this.ip.equals(datagram.destinationAddress)) {
      this.handlePacket(datagram);
      return null;
    }
    return this.routePacket(datagram);
  }
}
