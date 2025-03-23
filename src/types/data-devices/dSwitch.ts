import { IPv4Packet } from "../../packets/ip";
import { DeviceType } from "../view-devices/vDevice";
import { DeviceId } from "../graphs/datagraph";
import { Packet } from "../packet";
import { DataDevice } from "./dDevice";

export class DataSwitch extends DataDevice {
  receivePacket(packet: Packet): Promise<DeviceId | null> {
    const datagram = packet.rawPacket.payload;
    if (datagram instanceof IPv4Packet) {
      const dstDevice = this.datagraph.getDeviceByIP(
        datagram.destinationAddress,
      );
      if (!dstDevice) {
        console.error("Destination device not found");
        return null;
      }
      const path = this.datagraph.getPathBetween(this.id, dstDevice.id);
      return Promise.resolve(path.length > 1 ? path[1] : null);
    }
    return null;
  }

  getType(): DeviceType {
    return DeviceType.Switch;
  }
}
