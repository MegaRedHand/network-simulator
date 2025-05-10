import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DataGraph, NetworkDataNode } from "../graphs/datagraph";
import { DataDevice } from "./dDevice";

export abstract class DataNetworkDevice extends DataDevice {
  ip: IpAddress;
  ipMask: IpAddress;
  arpTable: Map<string, string>;
  private arpTableChangeListener: (() => void) | null = null;

  constructor(graphData: NetworkDataNode, datagraph: DataGraph) {
    super(graphData, datagraph);
    this.ip = IpAddress.parse(graphData.ip);
    this.ipMask = IpAddress.parse(graphData.mask);
    this.arpTable = new Map<string, string>(graphData.arpTable);
  }

  abstract receiveDatagram(datagram: IPv4Packet): void;

  /**
   * Update the ARP table and notify the listener.
   */
  updateArpTable(mac: MacAddress, ip: IpAddress): void {
    this.arpTable.set(ip.toString(), mac.toString());
    if (this.arpTableChangeListener) {
      this.arpTableChangeListener(); // Notify the listener
    }
  }

  /**
   * Set the listener for ARP table changes.
   */
  setArpTableChangeListener(listener: () => void): void {
    this.arpTableChangeListener = listener;
  }

  resolveAddress(ip: IpAddress): MacAddress {
    if (!this.arpTable.has(ip.toString())) {
      // As ip addr isn't in the table, then the 'entry' in device table never was modified.
      // The mac addr of the device that has the ip addr should be returned.
      const device = this.datagraph.getDeviceByIP(ip);
      return device ? device.mac : undefined;
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
