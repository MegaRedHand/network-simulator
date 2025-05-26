import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DataGraph, NetworkDataNode } from "../graphs/datagraph";
import { EntryData, Table } from "../network-modules/tables/table";
import { DataDevice } from "./dDevice";

export interface ArpEntry extends EntryData {
  ip: string;
  mac: string;
}

export abstract class DataNetworkDevice extends DataDevice {
  ipMask: IpAddress;
  arpTable: Table<ArpEntry>;
  private arpTableChangeListener: (() => void) | null = null;

  constructor(graphData: NetworkDataNode, datagraph: DataGraph) {
    super(graphData, datagraph);
    this.ipMask = IpAddress.parse(graphData.mask);
    this.arpTable = new Table<ArpEntry>(
      "ip",
      ((graphData.arpTable ?? []) as [string, string, boolean][]).map(
        ([ip, mac, edited]) => ({ ip, mac, edited }),
      ),
    );
  }

  abstract receiveDatagram(datagram: IPv4Packet): void;

  /**
   * Update the ARP table and notify the listener.
   */
  updateArpTable(mac: MacAddress, ip: IpAddress): void {
    this.arpTable.add({
      ip: ip.toString(),
      mac: mac.toString(),
      edited: false,
    });
    if (this.arpTableChangeListener) {
      this.arpTableChangeListener();
    }
  }

  /**
   * Set the listener for ARP table changes.
   */
  setArpTableChangeListener(listener: () => void): void {
    this.arpTableChangeListener = listener;
  }

  resolveAddress(
    ip: IpAddress,
  ): { mac: MacAddress; edited: boolean } | undefined {
    const entry = this.arpTable.get(ip.toString());
    if (!entry) {
      // Buscar el dispositivo y la MAC real si no está en la tabla
      const device = this.datagraph.getDeviceByIP(ip);
      if (!device) {
        console.warn(`Device with ip ${ip.toString()} not found in DataGraph`);
        return undefined;
      }
      const iface = device.interfaces.find((iface) => iface.ip?.equals(ip));
      return iface ? { mac: iface.mac, edited: false } : undefined;
    }
    // Si la entrada existe pero la MAC es "", se considera eliminada
    if (entry.mac === "") return undefined;
    return { mac: MacAddress.parse(entry.mac), edited: entry.edited };
  }

  getDataNode(): NetworkDataNode {
    return {
      ...super.getDataNode(),
      mask: this.ipMask.toString(),
      arpTable: this.arpTable.serialize(
        (entry) =>
          [entry.ip, entry.mac, entry.edited ?? false] as [
            string,
            string,
            boolean,
          ],
      ),
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
