import { Packet } from "./packet";
import { ViewGraph } from "./graphs/viewgraph";
import { Layer, layerIncluded } from "./layer";
import { DataGraph, DeviceId } from "./graphs/datagraph";
import { ViewNetworkDevice } from "./view-devices/vNetworkDevice";
import { IPv4Packet } from "../packets/ip";

export class PacketManager {
  private viewgraph: ViewGraph;
  private packetsInTransit: Map<string, Packet> = new Map<string, Packet>();

  constructor(viewgraph: ViewGraph) {
    this.viewgraph = viewgraph;
  }

  registerPacket(packet: Packet) {
    this.packetsInTransit.set(packet.packetId, packet);
  }

  deregisterPacket(packetId: string) {
    this.packetsInTransit.delete(packetId);
  }

  // SE CAMBIA CAPA (borrar luego)
  //   va paquete por paquete
  //   se fija si el paquete corresponde a la nueva capa (es visible o no)
  //   en caso de que lo sea lo manda al viewgraph,
  //   caso contrario, lo manda al datagraph
  //   para cada paquete, acomoda su:
  //     - currentStart
  //     - currentEnd
  //     - graph
  //   el calculo del progreso es como se venia haciendo
  //   se reenvia un packet para seguir con la transmision
  layerChanged(formerLayer: Layer, newLayer: Layer) {
    // ViewPacket: Packet shown in viewport
    // DataPacket: Packet not shown in viewport
    console.debug("Layer changed");
    const currKeys = Array.from(this.packetsInTransit.keys());
    for (const key of currKeys) {
      const packet = this.packetsInTransit.get(key);
      packet.visible = layerIncluded(packet.belongingLayer, newLayer);
    }
    console.debug("Layer changed finished");
  }
}
