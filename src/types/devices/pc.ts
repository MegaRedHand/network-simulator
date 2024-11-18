// src/devices/pc.ts

import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import PcImage from "../../assets/pc.svg";
import { Position } from "../common";
import { StyledInfo } from "../../graphics/right_bar";

export class Pc extends Device {
  constructor(id: number, viewgraph: ViewGraph, position: Position) {
    super(id, PcImage, viewgraph, position);
  }

  showInfo() {
    // TODO: move to StyledInfo
    const styledConnectedDevices =
      this.connections.size !== 0
        ? "[" + Array.from(this.connections.values()).join(", ") + "]"
        : "None";
    const info = new StyledInfo("PC Information");
    info.addField("ID", this.id.toString());
    info.addField("Connected Devices", styledConnectedDevices);
    this.rightbar.renderInfo(info);

    this.addCommonButtons();
  }

  getLayer(): Layer {
    return Layer.App;
  }

  getType(): DeviceType {
    return DeviceType.Pc;
  }
}
