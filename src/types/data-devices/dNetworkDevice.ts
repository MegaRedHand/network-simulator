import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DataGraph, NetworkDataNode } from "../graphs/datagraph";
import { DataDevice } from "./dDevice";

export abstract class DataNetworkDevice extends DataDevice {
  ipMask: IpAddress;
  arpTable: Map<string, string>;

  constructor(graphData: NetworkDataNode, datagraph: DataGraph) {
    super(graphData, datagraph);
    this.ipMask = IpAddress.parse(graphData.mask);
    this.arpTable = new Map<string, string>(graphData.arpTable);
  }

  abstract receiveDatagram(datagram: IPv4Packet): void;

  updateArpTable(mac: MacAddress, ip: IpAddress) {
    this.arpTable.set(ip.toString(), mac.toString());
  }

  resolveAddress(ip: IpAddress): MacAddress {
    if (!this.arpTable.has(ip.toString())) {
      // As ip addr isn't in the table, then the 'entry' in device table never was modified.
      // The mac addr of the device that has the ip addr should be returned.
      const device = this.datagraph.getDeviceByIP(ip);
      if (!device) {
        console.warn(`Device with ip ${ip.toString()} not found in DataGraph`);
        return undefined;
      }
      const iface = device.interfaces.find((iface) => iface.ip?.equals(ip));
      return iface ? iface.mac : undefined;
    }
    // There is an entry with key=ip.
    // This means either the entry has the address resolution expected or
    // the entry has "", then the entry was previously deleted.
    const mac = this.arpTable.get(ip.toString());
    return mac != "" ? MacAddress.parse(mac) : undefined;
  }

  getDataNode(): NetworkDataNode {
    return {
      ...super.getDataNode(),
      mask: this.ipMask.toString(),
      arpTable: Array.from(this.arpTable.entries()),
    };
  }

  ownIp(ip: IpAddress): boolean {
    return this.interfaces.some((iface) => iface.ip?.equals(ip));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handlePacket(_datagram: IPv4Packet) {
    // TODO: this is unused
  }

  receiveFrame(frame: EthernetFrame, iface: number): void {
    console.debug(
      `Device ${this.interfaces[iface].mac.toString()} receive frame with destination ${frame.destination.toString()}`,
    );
    if (!(frame.payload instanceof IPv4Packet)) {
      console.warn("Frame's payload is not an IPv4Packet");
      return null;
    }
    if (this.ownMac(frame.destination)) {
      return this.receiveDatagram(frame.payload);
    }
    return null;
  }
}
