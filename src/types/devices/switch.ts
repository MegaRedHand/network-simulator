import { IPv4Packet } from "../../packets/ip";
import { DeviceId } from "../graphs/datagraph";
import { Packet } from "../packet";
import { Device } from "./device";

export class Switch extends Device {
  viewgraph: any;

  receivePacket(packet: Packet): Promise<DeviceId | null> {
    const datagram = packet.rawPacket.payload;
    if (datagram instanceof IPv4Packet) {
      const dstDevice = this.viewgraph.getDeviceByIP(
        datagram.destinationAddress,
      );
      if (!dstDevice) {
        console.error("Destination device not found");
        return null;
      }
      const path = this.viewgraph.getPathBetween(this.id, dstDevice.id);
      return Promise.resolve(path.length > 1 ? path[1] : null);
    }
    return null;
  }
}
