import { Packet } from "./packet";
import { Layer, layerIncluded } from "./layer";

export class PacketManager {
  private packetsInTransit: Map<string, Packet> = new Map<string, Packet>();

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
  layerChanged(newLayer: Layer) {
    // ViewPacket: Packet shown in viewport
    // DataPacket: Packet not shown in viewport
    console.debug("Layer changed");
    for (const packet of this.packetsInTransit.values()) {
      packet.visible = layerIncluded(packet.belongingLayer, newLayer);
    }
    console.debug("Layer changed finished");
  }
}
