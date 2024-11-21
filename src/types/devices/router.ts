import { Device, DeviceType, Layer } from "./device";
import { EdgeId, ViewGraph } from "../graphs/viewgraph";
import RouterImage from "../../assets/router.svg";
import { Position } from "../common";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";
import { IpAddress } from "../../packets/ip";

type RoutingTableEntry = {
  ip: IpAddress;
  submask: number;
  interface: EdgeId;
};

export class Router extends Device {
  ip: IpAddress;
  routingTable: RoutingTableEntry[] = [];

  constructor(id: number, viewgraph: ViewGraph, position: Position) {
    super(id, RouterImage, viewgraph, position);
    this.ip = IpAddress.parse("10.0.0." + id);
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    info.addField("IP Address", this.ip.octets.join("."));
    info.addRoutingTable();
    RightBar.getInstance().renderInfo(info);
  }

  getLayer(): Layer {
    return Layer.Network;
  }

  getType(): DeviceType {
    return DeviceType.Router;
  }
}
