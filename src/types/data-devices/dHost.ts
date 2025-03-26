// MARCADO V1
import { IPv4Packet } from "../../packets/ip";
import {
  DataGraph,
  DeviceId,
  HostDataNode,
  NetworkDataNode,
} from "../graphs/datagraph";
import { Layer } from "../layer";
import { Packet } from "../packet";
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
    if (this.ip.equals(datagram.destinationAddress)) {
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
