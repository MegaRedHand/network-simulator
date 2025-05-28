import { DeviceType } from "../view-devices/vDevice";
import { DataDevice } from "./dDevice";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { DataGraph, DeviceId, SwitchDataNode } from "../graphs/datagraph";
import { EntryData, Table } from "../network-modules/tables/table";

export interface ForwardingEntry extends EntryData {
  mac: string;
  port: number;
}

export class DataSwitch extends DataDevice {
  forwardingTable: Table<ForwardingEntry>;
  private forwardingTableChangeListener: (() => void) | null = null;

  constructor(graphData: SwitchDataNode, datagraph: DataGraph) {
    super(graphData, datagraph);
    this.forwardingTable = new Table<ForwardingEntry>(
      "mac",
      graphData.forwardingTable.map(([mac, port, edited, deleted]) => ({
        mac,
        port,
        edited,
        deleted,
      })),
    );
  }

  getType(): DeviceType {
    return DeviceType.Switch;
  }

  updateForwardingTable(mac: MacAddress, iface: number): void {
    this.forwardingTable.add({
      mac: mac.toString(),
      port: iface,
    });
    if (this.forwardingTableChangeListener) {
      this.forwardingTableChangeListener();
    }
  }

  setForwardingTableChangeListener(listener: () => void): void {
    this.forwardingTableChangeListener = listener;
  }

  getDataNode(): SwitchDataNode {
    return {
      ...super.getDataNode(),
      forwardingTable: this.forwardingTable.serialize(
        (entry) =>
          [
            entry.mac,
            entry.port,
            entry.edited ?? false,
            entry.deleted ?? false,
          ] as [string, number, boolean, boolean],
      ),
      type: DeviceType.Switch,
    };
  }

  private forwardFrame(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    frame: EthernetFrame,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    nextHopId: DeviceId, // will be the interface where to send the packet
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    senderId: DeviceId, // will be the interface where the packet came from
  ) {
    // TODO: this is unused
  }

  // TODO: change all related senderId features to the receiver interface
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  receiveFrame(_frame: EthernetFrame, _senderId: DeviceId): void {
    // TODO: this is unused
  }
}
