import { Device, DeviceType, Layer } from "./device";
import { ViewGraph } from "../graphs/viewgraph";
import RouterImage from "../../assets/router.svg";
import { Position } from "../common";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";
import { IpAddress } from "../../packets/ip";

export class Router extends Device {
  constructor(
    id: number,
    viewgraph: ViewGraph,
    position: Position,
    ip: IpAddress,
    mask: IpAddress,
  ) {
    super(id, RouterImage, viewgraph, position, ip, mask);
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    info.addField("IP Address", this.ip.octets.join("."));
    info.addRoutingTable(this.generate_routing_table());
    RightBar.getInstance().renderInfo(info);
  }

  generate_routing_table(): { ip: string; mask: string; iface: string }[] {
    const routingTableEntries: { ip: string; mask: string; iface: string }[] =
      [];

    this.getConnections().forEach(({ edgeId, adyacentId }) => {
      const connectedDevice = this.viewgraph.getDevice(adyacentId);
      if (connectedDevice) {
        const ip = connectedDevice.ip.toString();
        const mask = connectedDevice.ipMask.toString();
        // Generate interface name based on edge ID
        const iface = `eth${edgeId}`;
        routingTableEntries.push({ ip, mask, iface });
      }
    });
    return routingTableEntries;
  }

  getLayer(): Layer {
    return Layer.Network;
  }

  getType(): DeviceType {
    return DeviceType.Router;
  }
}
