import { DeviceType } from "../view-devices/vDevice";
import { DataDevice } from "./dDevice";
import { EthernetFrame } from "../../packets/ethernet";

export class DataSwitch extends DataDevice {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  receiveFrame(frame: EthernetFrame): void {
    // TODO: this is unused
  }

  getType(): DeviceType {
    return DeviceType.Switch;
  }
}
