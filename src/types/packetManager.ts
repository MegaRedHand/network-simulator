import { DataPacket, Packet, ViewPacket } from "./packet";
import { ViewGraph } from "./graphs/viewgraph";
import { Layer, layerIncluded } from "./layer";
import { DataGraph, DeviceId } from "./graphs/datagraph";
import { ViewNetworkDevice } from "./view-devices";

export class PacketManager {
  private viewgraph: ViewGraph;
  private packetsInTransit: Map<string, Packet> = new Map<string, Packet>();

  constructor(viewgraph: ViewGraph) {
    this.viewgraph = viewgraph;
  }

  registerPacket(packet: Packet) {
    console.debug(`Registering packet ${packet.packetId}`);
    this.packetsInTransit.set(packet.packetId, packet);
  }

  deregisterPacket(packetId: string) {
    console.debug(`Deregistering packet ${packetId}`);
    this.packetsInTransit.delete(packetId);
  }

  // SE CAMBIA CAPA
  //   va paquete por paquete
  //   se fija si el paquete corresponde a la nueva capa (es visible o no)
  //   en caso de que lo sea lo manda al viewgraph,
  //   caso contrario, lo manda al datagraph
  //   para cada paquete, acomoda su:
  //     - currentStart
  //     - currentEdge
  //     - graph
  //     - tal vez nextDevice
  //   el calculo del progreso es como se venia haciendo
  //   se llama al packet para que reanude su transmision
  layerChanged(formerLayer: Layer, newLayer: Layer) {
    console.debug("Layer changed");
    Packet.pauseAnimation();
    const currKeys = Array.from(this.packetsInTransit.keys());
    for (const key of currKeys) {
      const packet = this.packetsInTransit.get(key);
      if (layerIncluded(packet.belongingLayer, newLayer)) {
        // Es un ViewPacket
        let newPrevDevice: DeviceId;
        let newNextDevice: DeviceId;
        if (layerIncluded(newLayer, formerLayer)) {
          [newPrevDevice, newNextDevice] = this.newRouteForUpperLayer(
            packet,
            this.viewgraph,
          );
        } else {
          [newPrevDevice, newNextDevice] = this.newRouteForLowerLayer(packet);
        }
        if (!(newPrevDevice && newNextDevice)) {
          console.warn("No se pudo encontrar un camino para el paquete");
          continue;
        }
        // TODO: change this to a more general approach
        const dstDevice = this.viewgraph.getDevice(newNextDevice);
        if (dstDevice instanceof ViewNetworkDevice) {
          console.debug("Setting destination MAC address");
          packet.rawPacket.destination = dstDevice.mac;
        }

        const viewPacket: ViewPacket = new ViewPacket(
          this.viewgraph,
          packet.belongingLayer,
          packet.type,
          packet.srcId,
          packet.dstId,
          packet.rawPacket,
          packet.ctx,
        );
        viewPacket.setCurrStart(newPrevDevice);
        viewPacket.setProgress(packet.progress);
        const newCurrEdge = this.viewgraph.getEdge(
          newPrevDevice,
          newNextDevice,
        );
        viewPacket.traverseEdge(newCurrEdge, newPrevDevice);

        console.debug(
          `New View Packet! Traveling from ${newPrevDevice} to ${newNextDevice}`,
        );
      } else {
        const [_, newNextDevice] = this.newRouteForUpperLayer(
          packet,
          this.viewgraph.getDataGraph(),
        );
        // Es un DataPacket
        const dataPacket: DataPacket = new DataPacket(
          this.viewgraph.getDataGraph(),
          packet.belongingLayer,
          packet.type,
          packet.srcId,
          packet.dstId,
          packet.rawPacket,
          packet.ctx,
        );

        const { prevDevice } = packet.getPacketLocation();
        dataPacket.setProgress(packet.progress);
        dataPacket.traverseEdge(prevDevice, newNextDevice);

        console.debug(
          `New Data Packet! Traveling from ${prevDevice} to ${newNextDevice}`,
        );
      }
      packet.delete();
    }
    Packet.resumeAnimation();
    console.debug("Layer changed finished");
  }

  private newRouteForLowerLayer(packet: Packet) {
    console.debug("Entro al lower");
    const { prevDevice, nextDevice, currProgress } = packet.getPacketLocation();
    const pathBetweenPackets = this.viewgraph.getPathBetween(
      prevDevice,
      nextDevice,
    );
    if (!pathBetweenPackets) {
      console.warn("No se encontro un camino entre los dispositivos");
      return;
    }
    if (pathBetweenPackets.length == 2) {
      // same two devices
      return [prevDevice, nextDevice];
    }
    const amountEdges = pathBetweenPackets.length - 1;
    // map the packet progress in former viewgraph edge to the new current edge
    const idx = Math.ceil(amountEdges * currProgress);
    const [newPrevDevice, newNextDevice] = [
      pathBetweenPackets[idx - 1],
      pathBetweenPackets[idx],
    ];
    return [newPrevDevice, newNextDevice];
  }

  private newRouteForUpperLayer(
    packet: Packet,
    graph: DataGraph | ViewGraph,
  ): [DeviceId, DeviceId] {
    console.debug("Entro al upper");
    const { prevDevice } = packet.getPacketLocation();
    const pathBetweenPackets = graph.getPathBetween(prevDevice, packet.dstId);
    if (!pathBetweenPackets) {
      console.warn("No se encontro un camino entre los dispositivos");
      return;
    }
    const newNextDevice = pathBetweenPackets[1];
    return [prevDevice, newNextDevice];
  }
}

//      U       L
//
// v  nRFUL    nRFLL
//
// d  nRFUL   no pasa
