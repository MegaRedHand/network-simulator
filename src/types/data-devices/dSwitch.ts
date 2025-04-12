import { DeviceType } from "../view-devices/vDevice";
import { DataDevice } from "./dDevice";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { DataGraph, DeviceId, SwitchDataNode } from "../graphs/datagraph";

export class DataSwitch extends DataDevice {
  //                      would be interface
  switchingTable: Map<string, DeviceId> = new Map<string, DeviceId>();

  constructor(graphData: SwitchDataNode, datagraph: DataGraph) {
    super(graphData, datagraph);
    this.switchingTable = new Map<string, number>(graphData.switchingTable);
  }

  getType(): DeviceType {
    return DeviceType.Switch;
  }

  updateSwitchingTable(mac: MacAddress, deviceId: DeviceId): void {
    if (!this.switchingTable.has(mac.toString())) {
      console.debug(`Adding ${mac.toString()} to the switching table`);
      this.switchingTable.set(mac.toString(), deviceId);
    }
  }

  getDataNode(): SwitchDataNode {
    return {
      ...super.getDataNode(),
      switchingTable: Array.from(this.switchingTable.entries()),
      type: DeviceType.Switch,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
