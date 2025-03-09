import { Packet, PacketInfo } from "./packet";
import { DeviceId } from "./graphs/datagraph";
import { Edge } from "./edge";
import { ViewGraph } from "./graphs/viewgraph";

export class PacketManager {
  private viewgraph: ViewGraph;

  constructor(viewgraph: ViewGraph) {
    this.viewgraph = viewgraph;
  }

  getPacketsInTransit(): Packet[] {
    const packetsInTransit: Packet[] = [];

    this.viewgraph.getEdges().forEach((edge) => {
      const edgePackets = edge.getPackets();
      packetsInTransit.push(...Array.from(edgePackets));
    });

    console.debug(`[PACKETS] All packets: ${packetsInTransit.length}`);
    return packetsInTransit;
  }

  addPackets(packetsInTransit: Packet[], changeToUpperLayer: boolean) {
    if (changeToUpperLayer) {
      this.getNewDevicesForUpperLayer(packetsInTransit);
    } else {
      this.getNewDevicesForLowerLayer(packetsInTransit);
    }
  }

  private getNewDevicesForLowerLayer(packetsInTransit: Packet[]) {
    packetsInTransit.forEach((packet) => {
      const { prevDevice, nextDevice, currProgress } = packet.getPacketInfo();
      const pathBetweenPackets = this.viewgraph.getPathBetween(
        prevDevice,
        nextDevice,
      );
      if (pathBetweenPackets.length == 2) {
        // siga siga
      }
      const amountEdges = pathBetweenPackets.length - 1;
      const idx = Math.ceil(amountEdges * currProgress);
      const [newPrevDevice, newNextDevice] = [
        pathBetweenPackets[idx - 1],
        pathBetweenPackets[idx],
      ];
      console.debug(
        `ReloadLocation with ${newPrevDevice} and ${newNextDevice}`,
      );
      packet.reloadLocation(newPrevDevice, newNextDevice);
    });
  }

  private getNewDevicesForUpperLayer(packetsInTransit: Packet[]) {
    console.debug("Entro al upper");
    packetsInTransit.forEach((packet) => {
      const { prevDevice } = packet.getPacketInfo();
      const pathBetweenPackets = this.viewgraph.getPathBetween(
        prevDevice,
        packet.dstId,
      );
      const newNextDevice = pathBetweenPackets[1];
      console.debug(`ReloadLocation with ${prevDevice} and ${newNextDevice}`);
      packet.reloadLocation(prevDevice, newNextDevice);
    });
  }
}
