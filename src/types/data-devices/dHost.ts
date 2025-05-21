import { IPv4Packet } from "../../packets/ip";
import { DataGraph, HostDataNode } from "../graphs/datagraph";
import { Layer } from "../layer";
import { DataNetworkDevice } from "./dNetworkDevice";
import { DeviceType } from "../view-devices/vDevice";
import { RunningProgram } from "../../programs";

export class DataHost extends DataNetworkDevice {
  runningPrograms: RunningProgram[] = [];

  constructor(graphData: HostDataNode, datagraph: DataGraph) {
    super(graphData, datagraph);
    this.runningPrograms = graphData.runningPrograms ?? [];
  }

  getDataNode(): HostDataNode {
    return {
      ...super.getDataNode(),
      type: DeviceType.Host,
      runningPrograms: this.runningPrograms,
    };
  }

  receiveDatagram(datagram: IPv4Packet): void {
    if (!(datagram instanceof IPv4Packet)) {
      return null;
    }
    if (this.ownIp(datagram.destinationAddress)) {
      this.handlePacket(datagram);
    }
  }

  getType(): DeviceType {
    return DeviceType.Host;
  }

  getLayer(): Layer {
    return Layer.App;
  }
}
