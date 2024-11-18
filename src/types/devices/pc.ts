import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import PcImage from "../../assets/pc.svg";
import { Position } from "../common";
import { DeviceInfo } from "../../graphics/right_bar";

export class Pc extends Device {
  constructor(id: number, viewgraph: ViewGraph, position: Position) {
    super(id, PcImage, new DeviceInfo("PC"), viewgraph, position);
  }

  getLayer(): Layer {
    return Layer.App;
  }

  getType(): DeviceType {
    return DeviceType.Pc;
  }
}
