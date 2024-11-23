import { Device, DeviceType, Layer } from "./device";
import { EdgeId, ViewGraph } from "../graphs/viewgraph";
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
    // Añadir la tabla de enrutamiento al panel de información
    info.addRoutingTable(this.generate_routing_table());
    RightBar.getInstance().renderInfo(info);
  }

  generate_routing_table(): { ip: string; mask: string; iface: string }[] {
    const routingTableEntries: { ip: string; mask: string; iface: string }[] =
      [];

    this.getConnections().forEach(({ edgeId, adyacentId }) => {
      const connectedDevice = this.viewgraph.getDevice(adyacentId);
      if (connectedDevice) {
        routingTableEntries.push({
          ip: connectedDevice.ip.toString(), // Obtener la IP del dispositivo conectado
          mask: connectedDevice.ip_mask.toString(), // Obtener la máscara del dispositivo conectado
          iface: `eth${edgeId}`, // Generar nombre de la interfaz basado en el ID de la edge
        });
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
