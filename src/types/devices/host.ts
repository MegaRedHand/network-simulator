import { IPv4Packet } from "../../packets/ip";
import { DataGraph, DeviceId, HostDataNode } from "../graphs/datagraph";
import { Layer } from "../layer";
import { Packet } from "../packet";
import { NetworkDevice } from "./networkDevice";
import { DeviceType } from "../deviceNodes/deviceNode";
import { RunningProgram } from "../../programs";

export class Host extends NetworkDevice {
  runningPrograms: RunningProgram[] = [];

  constructor(graphData: HostDataNode, datagraph: DataGraph) {
    super(graphData, datagraph);
    this.runningPrograms = graphData.runningPrograms ?? [];
  }

  receiveDatagram(packet: Packet): Promise<DeviceId | null> {
    const datagram = packet.rawPacket.payload;
    if (!(datagram instanceof IPv4Packet)) {
      return null;
    }
    if (this.ip.equals(datagram.destinationAddress)) {
      this.handlePacket(datagram);
    }
    return null;
  }

  getType(): DeviceType {
    return DeviceType.Host;
  }

  getLayer(): Layer {
    return Layer.App;
  }
}
