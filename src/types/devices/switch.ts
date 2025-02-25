import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import SwitchImage from "../../assets/switch.svg";
import { Position } from "../common";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";
import { DeviceId } from "../graphs/datagraph";
import { Packet } from "../packet";
import { Texture } from "pixi.js";
import { MacAddress } from "../../packets/ethernet";
import { IPv4Packet } from "../../packets/ip";

export class Switch extends Device {
  static DEVICE_TEXTURE: Texture;

  static getTexture() {
    if (!Switch.DEVICE_TEXTURE) {
      Switch.DEVICE_TEXTURE = Texture.from(SwitchImage);
    }
    return Switch.DEVICE_TEXTURE;
  }

  constructor(
    id: DeviceId,
    viewgraph: ViewGraph,
    position: Position,
    mac: MacAddress,
  ) {
    console.log(mac)
    super(id, Switch.getTexture(), viewgraph, position, mac);
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    info.addField("MacAddress", this.mac.toString());
    info.addEmptySpace();
    RightBar.getInstance().renderInfo(info);
  }

  getLayer(): Layer {
    return Layer.Link;
  }

  getType(): DeviceType {
    return DeviceType.Switch;
  }

  receivePacket(packet: Packet): DeviceId | null {
    const datagram = packet.rawPacket.payload;
    if (datagram instanceof IPv4Packet) {
      const dstDevice = this.viewgraph.getDeviceByIP(
        datagram.destinationAddress,
      );
      const path = this.viewgraph.getPathBetween(this.id, dstDevice.id);
      return path.length > 1 ? path[1] : null;
    }
    return null;
  }
}
