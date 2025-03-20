import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import SwitchImage from "../../assets/switch.svg";
import { Position } from "../common";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";
import { DeviceId } from "../graphs/datagraph";
import { Texture } from "pixi.js";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { IPv4Packet } from "../../packets/ip";
import { GlobalContext } from "../../context";

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
    ctx: GlobalContext,
    position: Position,
    mac: MacAddress,
  ) {
    super(id, Switch.getTexture(), viewgraph, ctx, position, mac);
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    info.addEmptySpace();
    RightBar.getInstance().renderInfo(info);
  }

  getLayer(): Layer {
    return Layer.Link;
  }

  getType(): DeviceType {
    return DeviceType.Switch;
  }

  receiveFrame(frame: EthernetFrame): Promise<DeviceId | null> {
    const datagram = frame.payload;
    if (datagram instanceof IPv4Packet) {
      const dstDevice = this.viewgraph.getDeviceByIP(
        datagram.destinationAddress,
      );
      if (!dstDevice) {
        console.error("Destination device not found");
        return null;
      }
      const path = this.viewgraph.getPathBetween(this.id, dstDevice.id);
      return Promise.resolve(path.length > 1 ? path[1] : null);
    }
    return null;
  }
}
