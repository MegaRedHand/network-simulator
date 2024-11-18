import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import ServerImage from "../../assets/server.svg";
import { Position } from "../common";
import { DeviceInfo } from "../../graphics/right_bar";

export class Server extends Device {
  constructor(id: number, viewgraph: ViewGraph, position: Position) {
    super(id, ServerImage, new DeviceInfo("Server"), viewgraph, position);
  }

  getLayer(): Layer {
    return Layer.App;
  }

  getType(): DeviceType {
    return DeviceType.Server;
  }
}
