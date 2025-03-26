import { DataPacket, Packet, ViewPacket } from "./packet";
import { ViewGraph } from "./graphs/viewgraph";
import { Layer, layerIncluded } from "./layer";
import { DataGraph, DeviceId } from "./graphs/datagraph";
import { ViewNetworkDevice } from "./view-devices/vNetworkDevice";

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
      const rawPacket = packet.getRawPacket();
      const dstDevice = this.viewgraph.getDeviceByMac(rawPacket.destination);
      if (layerIncluded(packet.belongingLayer, newLayer)) {
        // Es un ViewPacket
        let newPrevDeviceId: DeviceId;
        let newNextDeviceId: DeviceId;
        if (layerIncluded(newLayer, formerLayer)) {
          [newPrevDeviceId, newNextDeviceId] = this.newRouteForUpperLayer(
            packet,
            this.viewgraph,
            dstDevice.id,
          );
        } else {
          [newPrevDeviceId, newNextDeviceId] =
            this.newRouteForLowerLayer(packet);
        }
        if (!(newPrevDeviceId && newNextDeviceId)) {
          console.warn("No se pudo encontrar un camino para el paquete");
          continue;
        }
        // TODO: change this to a more general approach
        const newNextDevice = this.viewgraph.getDevice(newNextDeviceId);
        if (dstDevice instanceof ViewNetworkDevice) {
          console.debug("Setting destination MAC address");
          rawPacket.destination = dstDevice.mac;
        }

        const viewPacket: ViewPacket = new ViewPacket(
          this.viewgraph,
          packet.belongingLayer,
          packet.getType(),
          rawPacket,
          this.viewgraph.ctx,
        );
        viewPacket.setCurrStart(newPrevDeviceId);
        viewPacket.setProgress(packet.getProgress());
        const newCurrEdge = this.viewgraph.getEdge(
          newPrevDeviceId,
          newNextDeviceId,
        );
        viewPacket.traverseEdge(newCurrEdge, newPrevDeviceId);

        console.debug(
          `New View Packet! Traveling from ${newPrevDeviceId} to ${newNextDeviceId}`,
        );
      } else {
        const [_, newNextDeviceId] = this.newRouteForUpperLayer(
          packet,
          this.viewgraph.getDataGraph(),
          dstDevice.id,
        );
        // Es un DataPacket
        const dataPacket: DataPacket = new DataPacket(
          this.viewgraph.getDataGraph(),
          packet.belongingLayer,
          packet.getType(),
          rawPacket,
          packet.ctx,
        );

        const { prevDevice } = packet.getPacketLocation();
        dataPacket.setProgress(packet.getProgress());
        dataPacket.traverseEdge(prevDevice, newNextDeviceId);

        console.debug(
          `New Data Packet! Traveling from ${prevDevice} to ${newNextDeviceId}`,
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
    dstDevice: DeviceId,
  ): [DeviceId, DeviceId] {
    console.debug("Entro al upper");
    const { prevDevice, nextDevice } = packet.getPacketLocation();
    const pathBetweenPackets = graph.getPathBetween(
      prevDevice,
      graph.hasDevice(nextDevice) ? nextDevice : dstDevice,
    );

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
