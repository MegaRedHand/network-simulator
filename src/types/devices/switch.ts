import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import SwitchImage from "../../assets/switch.svg";
import { Position } from "../common";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";
import { DeviceId } from "../graphs/datagraph";
import { Packet } from "../packet";
import { Texture } from "pixi.js";

export class Switch extends Device {
  static DEVICE_TEXTURE: Texture;

  static getTexture() {
    if (!Switch.DEVICE_TEXTURE) {
      Switch.DEVICE_TEXTURE = Texture.from(SwitchImage);
    }
    return Switch.DEVICE_TEXTURE;
  }

  constructor(id: DeviceId, viewgraph: ViewGraph, position: Position) {
    super(id, Switch.getTexture(), viewgraph, position, null, null);
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    RightBar.getInstance().renderInfo(info);
  }

  getLayer(): Layer {
    return Layer.Link;
  }

  getType(): DeviceType {
    return DeviceType.Switch;
  }

  async receivePacket(packet: Packet): Promise<DeviceId | null> {
    console.log(packet); // lint
    throw new Error("Method not implemented.");
  }
}
