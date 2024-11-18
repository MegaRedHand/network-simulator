// src/devices/server.ts

import { Device } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import ServerImage from "../../assets/server.svg";
import { Position } from "../common";

export class Server extends Device {
  constructor(id: number, viewgraph: ViewGraph, position: Position) {
    super(id, ServerImage, viewgraph, position);
  }

  showInfo() {
    this.rightbar.renderInfo("Server Information", [
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
