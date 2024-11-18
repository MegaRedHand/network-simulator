// src/devices/router.ts

import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import RouterImage from "../../assets/router.svg";
import { Position } from "../common";
import { StyledInfo } from "../../graphics/right_bar";

export class Router extends Device {
  constructor(id: number, viewgraph: ViewGraph, position: Position) {
    super(id, RouterImage, viewgraph, position);
  }

  showInfo() {
    // TODO: move to StyledInfo
    const styledConnectedDevices =
      this.connections.size !== 0
        ? "[" + Array.from(this.connections.values()).join(", ") + "]"
        : "None";
    const info = new StyledInfo("Router Information");
    info.addField("ID", this.id.toString());
    info.addField("Connected Devices", styledConnectedDevices);
    this.rightbar.renderInfo(info);

    this.addCommonButtons();
  }

  getLayer(): Layer {
    return Layer.Network;
  }

  getType(): DeviceType {
    return DeviceType.Router;
  }
}
