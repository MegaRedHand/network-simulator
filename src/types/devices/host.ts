import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import PcImage from "../../assets/pc.svg";
import { Position } from "../common";
import { IpAddress } from "../../packets/ip";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";

export class Host extends Device {
  ip: IpAddress;

  constructor(id: number, viewgraph: ViewGraph, position: Position) {
    super(id, PcImage, viewgraph, position);
    this.ip = IpAddress.parse("10.0.0." + id);
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    info.addField("IP Address", this.ip.octets.join("."));
    RightBar.getInstance().renderInfo(info);
  }

  getLayer(): Layer {
    return Layer.App;
  }

  getType(): DeviceType {
    return DeviceType.Host;
  }
}
