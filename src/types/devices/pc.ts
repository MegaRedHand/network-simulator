import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import PcImage from "../../assets/pc.svg";
import { Position } from "../common";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";

export class Pc extends Device {
  constructor(id: number, viewgraph: ViewGraph, position: Position) {
    super(id, PcImage, viewgraph, position);
  }

  showInfo() {
    const info = new DeviceInfo("PC");
    info.addField("ID", this.id.toString());
    info.addListField(
      "Connected Devices",
      Array.from(this.connections.values()),
    );
    RightBar.getInstance().renderInfo(info);

    this.addCommonButtons();
  }

  getLayer(): Layer {
    return Layer.App;
  }

  getType(): DeviceType {
    return DeviceType.Pc;
  }
}
