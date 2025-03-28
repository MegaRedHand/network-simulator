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
    Packet.pauseAnimation();
    const currKeys = Array.from(this.packetsInTransit.keys());
    for (const key of currKeys) {
      const packet = this.packetsInTransit.get(key);
      const rawPacket = packet.getRawPacket();
      // newEndDevice calculation
      const dstDevice = this.viewgraph.getDeviceByIP(
        rawPacket.payload instanceof IPv4Packet
          ? rawPacket.payload.destinationAddress
          : undefined,
      );
      if (layerIncluded(packet.belongingLayer, newLayer)) {
        // Its a ViewPacket
        let newStartId: DeviceId;
        let newEndId: DeviceId;
        if (layerIncluded(newLayer, formerLayer)) {
          [newStartId, newEndId] = this.newRouteForUpperLayer(
            packet,
            this.viewgraph,
            dstDevice.id,
          );
        } else {
          [newStartId, newEndId] = this.newRouteForLowerLayer(packet);
        }
        if (!(newStartId && newEndId)) {
          console.warn("No se pudo encontrar un camino para el paquete");
          continue;
        }
        const newEnd = this.viewgraph.getDevice(newEndId);
        if (!newEnd) {
          console.warn("No se pudo encontrar el dispositivo de destino");
          continue;
        }
        if (newEnd instanceof ViewNetworkDevice) {
          rawPacket.destination = newEnd.mac;
        }

        const viewPacket: Packet = new Packet(
          this.viewgraph,
          rawPacket,
          this.viewgraph.ctx,
          true,
        );
        viewPacket.setProgress(packet.getProgress());
        viewPacket.traverseEdge(newStartId, newEndId);

        console.debug(
          `New View Packet! Traveling from ${newStartId} to ${newEndId}`,
        );
      } else {
        const [, newEndId] = this.newRouteForUpperLayer(
          packet,
          this.viewgraph.getDataGraph(),
          dstDevice.id,
        );
        // Its a DataPacket
        const dataPacket: Packet = new Packet(
          this.viewgraph.getDataGraph(),
          rawPacket,
          packet.ctx,
          false,
        );

        const { startId } = packet.getPacketLocation();
        dataPacket.setProgress(packet.getProgress());
        dataPacket.traverseEdge(startId, newEndId);

        console.debug(
          `New Data Packet! Traveling from ${startId} to ${newEndId}`,
        );
      }
      packet.delete();
    }
    Packet.resumeAnimation();
    console.debug("Layer changed finished");
  }

  private newRouteForLowerLayer(packet: Packet) {
    const { startId, endId, currProgress } = packet.getPacketLocation();
    const pathBetweenPackets = this.viewgraph.getPathBetween(startId, endId);
    if (!pathBetweenPackets) {
      console.warn("No se encontro un camino entre los dispositivos");
      return;
    }
    if (pathBetweenPackets.length == 2) {
      // same two devices
      return [startId, endId];
    }
    const amountEdges = pathBetweenPackets.length - 1;
    // map the packet progress in former viewgraph edge to the new current edge
    const idx = Math.ceil(amountEdges * currProgress);
    const [newsStartId, newEnd] = [
      pathBetweenPackets[idx - 1],
      pathBetweenPackets[idx],
    ];
    return [newsStartId, newEnd];
  }

  private newRouteForUpperLayer(
    packet: Packet,
    graph: DataGraph | ViewGraph,
    dstDevice: DeviceId,
  ): [DeviceId, DeviceId] {
    const { startId, endId } = packet.getPacketLocation();
    const pathBetweenPackets = graph.getPathBetween(
      startId,
      graph.hasDevice(endId) ? endId : dstDevice,
    );

    if (!pathBetweenPackets) {
      console.warn("No se encontro un camino entre los dispositivos");
      return;
    }
    const newEnd = pathBetweenPackets[1];
    return [startId, newEnd];
  }
}

//      U       L
//
// v  nRFUL    nRFLL
//
// d  nRFUL   no pasa
