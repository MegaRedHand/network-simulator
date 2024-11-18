// src/devices/server.ts

import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import ServerImage from "../../assets/server.svg";
import { Position } from "../common";
import { RightBar, StyledInfo } from "../../graphics/right_bar";

export class Server extends Device {
  constructor(id: number, viewgraph: ViewGraph, position: Position) {
    super(id, ServerImage, viewgraph, position);
  }

  showInfo() {
    const info = new StyledInfo("Server Information");
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
    return DeviceType.Server;
  }
}
