import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import RouterImage from "../../assets/router.svg";
import { Position } from "../common";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";
import { IpAddress } from "../../packets/ip";
import { DeviceId, isRouter } from "../graphs/datagraph";
import { Packet } from "../packet";
import { Texture } from "pixi.js";

export class Router extends Device {
  static DEVICE_TEXTURE: Texture;

  static getTexture() {
    if (!Router.DEVICE_TEXTURE) {
      Router.DEVICE_TEXTURE = Texture.from(RouterImage);
    }
    return Router.DEVICE_TEXTURE;
  }

  constructor(
    id: DeviceId,
    viewgraph: ViewGraph,
    position: Position,
    ip: IpAddress,
    mask: IpAddress,
  ) {
    super(id, Router.getTexture(), viewgraph, position, ip, mask);
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

  routePacket(packet: Packet): DeviceId | null {
    const device = this.viewgraph.getDataGraph().getDevice(this.id);
    if (!device || !isRouter(device)) {
      return null;
    }
    const result = device.routingTable.find((entry) => {
      const ip = IpAddress.parse(entry.ip);
      const mask = IpAddress.parse(entry.mask);
      console.log("considering entry:", entry);
      return packet.rawPacket.destinationAddress.isInSubnet(ip, mask);
    });
    console.log("result:", result);
    return result === undefined ? null : result.iface;
  }

  receivePacket(packet: Packet): DeviceId | null {
    if (this.ip.equals(packet.rawPacket.destinationAddress)) {
      this.handlePacket(packet);
      return null;
    }
    return this.routePacket(packet);
  }
}
