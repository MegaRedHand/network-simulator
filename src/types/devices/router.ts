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
import { Packet } from "../packet";

export class Router extends NetworkDevice {
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
    mac: MacAddress,
    ip: IpAddress,
    mask: IpAddress,
  ) {
    super(id, Router.getTexture(), viewgraph, position, mac, ip, mask);
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    info.addField("IP Address", this.ip.octets.join("."));
    info.addField("MacAddress", this.mac.toString());
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

  routePacket(datagram: IPv4Packet): DeviceId | null {
    const device = this.viewgraph.getDataGraph().getDevice(this.id);
    if (!device || !isRouter(device)) {
      return null;
    }
    const result = device.routingTable.find((entry) => {
      if (entry.deleted) {
        console.log("Skipping deleted entry:", entry);
        return false;
      }
      const ip = IpAddress.parse(entry.ip);
      const mask = IpAddress.parse(entry.mask);
      console.log("Considering entry:", entry);
      return datagram.destinationAddress.isInSubnet(ip, mask);
    });
    console.log("Result:", result);
    return result === undefined ? null : result.iface;
  }

  receiveDatagram(packet: Packet): DeviceId | null {
    console.log("LLEGUE A RECEIVE DATAGRAM");
    const datagram = packet.rawPacket.payload;
    if (!(datagram instanceof IPv4Packet)) {
      return null;
    }
    if (this.ip.equals(datagram.destinationAddress)) {
      this.handlePacket(datagram);
      return null;
    }
    // a router changed forward datagram to destination, have to change current destination mac
    const dstDevice = this.viewgraph.getDeviceByIP(datagram.destinationAddress);
    const path = this.viewgraph.getPathBetween(this.id, dstDevice.id);
    let dstMac = dstDevice.mac;
    if (!path) return null;
    for (const id of path.slice(1)) {
      const device = this.viewgraph.getDevice(id);
      if (device instanceof NetworkDevice) {
        dstMac = device.mac;
        break;
      }
    }
    packet.rawPacket.destination = dstMac;
    return this.routePacket(datagram);
  }
}
