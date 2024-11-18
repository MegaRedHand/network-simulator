// src/devices/router.ts

import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import RouterImage from "../../assets/router.svg";
import { Position } from "../common";

export class Router extends Device {
  constructor(id: number, viewgraph: ViewGraph, position: Position) {
    super(id, RouterImage, viewgraph, position);
  }

  showInfo() {
    this.rightbar.renderInfo("Router Information", [
      { label: "ID", value: this.id.toString() },
      {
        label: "Connected Devices",
        value:
          this.connections.size !== 0
            ? "[" + Array.from(this.connections.values()).join(", ") + "]"
            : "None",
      },
    ]);

    this.addCommonButtons();
  }

  getLayer(): Layer {
    return Layer.Network;
  }

  getType(): DeviceType {
    return DeviceType.Router;
  }
}
