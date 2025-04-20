import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DataGraph, NetworkDataNode } from "../graphs/datagraph";
import { DataDevice } from "./dDevice";

export abstract class DataNetworkDevice extends DataDevice {
  ip: IpAddress;
  ipMask: IpAddress;
  arpTable: Map<string, string>;

  constructor(graphData: NetworkDataNode, datagraph: DataGraph) {
    super(graphData, datagraph);
    this.ip = IpAddress.parse(graphData.ip);
    this.ipMask = IpAddress.parse(graphData.mask);
    this.arpTable = new Map<string, string>(graphData.arpTable);
  }

  abstract receiveDatagram(datagram: IPv4Packet): void;

  updateArpTable(mac: MacAddress, ip: IpAddress) {
    this.arpTable.set(ip.toString(), mac.toString());
  }

  getDataNode(): NetworkDataNode {
    return {
      ...super.getDataNode(),
      ip: this.ip.toString(),
      mask: this.ipMask.toString(),
      arpTable: Array.from(this.arpTable.entries()),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handlePacket(_datagram: IPv4Packet) {
    // TODO: this is unused
  }

  receiveFrame(frame: EthernetFrame): void {
    console.debug(
      `Device ${this.mac.toString()} receive frame with destination ${frame.destination.toString()}`,
    );
    if (!(frame.payload instanceof IPv4Packet)) {
      console.warn("Frame's payload is not an IPv4Packet");
      return null;
    }
    if (this.mac.equals(frame.destination)) {
      return this.receiveDatagram(frame.payload);
    }
    return null;
  }
}
