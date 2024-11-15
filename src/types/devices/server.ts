// src/devices/server.ts

import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import ServerImage from "../../assets/server.svg";

export class Server extends Device {
  constructor(
    id: number,
    viewgraph: ViewGraph,
    position: { x: number; y: number },
  ) {
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

  getLayer(): Layer {
    return Layer.App;
  }

  getType(): DeviceType {
    return DeviceType.Server;
  }
}
