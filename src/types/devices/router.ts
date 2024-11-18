import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import RouterImage from "../../assets/router.svg";
import { Position } from "../common";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";

export class Router extends Device {
  constructor(id: number, viewgraph: ViewGraph, position: Position) {
    super(id, RouterImage, viewgraph, position);
  }

  showInfo() {
    const info = new DeviceInfo("Router");
    info.addField("ID", this.id.toString());
    info.addListField(
      "Connected Devices",
      Array.from(this.connections.values()),
    );
    RightBar.getInstance().renderInfo(info);

    this.addCommonButtons();
  }

  getLayer(): Layer {
    return Layer.Network;
  }

  getType(): DeviceType {
    return DeviceType.Router;
  }
}
