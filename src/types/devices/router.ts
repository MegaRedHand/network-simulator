import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import RouterImage from "../../assets/router.svg";
import { Position } from "../common";

export class Router extends Device {
  constructor(id: number, viewgraph: ViewGraph, position: Position) {
    super(id, RouterImage, viewgraph, position);
  }

  getLayer(): Layer {
    return Layer.Network;
  }

  getType(): DeviceType {
    return DeviceType.Router;
  }
}
