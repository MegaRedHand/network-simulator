import { DeviceType } from "../view-devices/vDevice";
import { DataDevice } from "./dDevice";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { DataGraph, DeviceId, SwitchDataNode } from "../graphs/datagraph";
import { EntryData, Table } from "../network-modules/tables/table";

export interface SwitchingEntry extends EntryData {
  mac: string;
  port: number;
}

export class DataSwitch extends DataDevice {
  switchingTable: Table<SwitchingEntry>;
  private switchingTableChangeListener: (() => void) | null = null;

  constructor(graphData: SwitchDataNode, datagraph: DataGraph) {
    super(graphData, datagraph);
    this.switchingTable = new Table<SwitchingEntry>(
      "mac",
      graphData.switchingTable.map(([mac, port, edited]) => ({
        mac,
        port,
        edited,
      })),
    );
  }

  getType(): DeviceType {
    return DeviceType.Switch;
  }

  updateSwitchingTable(mac: MacAddress, iface: number): void {
    this.switchingTable.add({
      mac: mac.toString(),
      port: iface,
      edited: false,
    });
    if (this.switchingTableChangeListener) {
      this.switchingTableChangeListener();
    }
  }

  setSwitchingTableChangeListener(listener: () => void): void {
    this.switchingTableChangeListener = listener;
  }

  getDataNode(): SwitchDataNode {
    return {
      ...super.getDataNode(),
      switchingTable: this.switchingTable.serialize(
        (entry) =>
          [entry.mac, entry.port, entry.edited ?? false] as [
            string,
            number,
            boolean,
          ],
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
