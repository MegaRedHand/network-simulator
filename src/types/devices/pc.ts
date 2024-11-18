// src/devices/pc.ts

import { Device } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import PcImage from "../../assets/pc.svg";
import { Position } from "../common";

export class Pc extends Device {
  constructor(id: number, viewgraph: ViewGraph, position: Position) {
    super(id, PcImage, viewgraph, position);
  }

  showInfo() {
    this.rightbar.renderInfo("PC Information", [
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
}
