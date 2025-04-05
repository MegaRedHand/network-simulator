import { DeviceType } from "../view-devices/vDevice";
import { DataDevice } from "./dDevice";
import { EthernetFrame } from "../../packets/ethernet";

export class DataSwitch extends DataDevice {
  receiveFrame(_frame: EthernetFrame): void {
    // TODO: this is unused
  }

  getType(): DeviceType {
    return DeviceType.Switch;
  }
}
