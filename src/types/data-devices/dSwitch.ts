// MARCADO V1
import { IPv4Packet } from "../../packets/ip";
import { DeviceType } from "../view-devices/vDevice";
import { Layer } from "../layer";
import { DeviceId } from "../graphs/datagraph";
import { Packet, sendRawPacket } from "../packet";
import { DataDevice } from "./dDevice";
import { EthernetFrame } from "../../packets/ethernet";

export class DataSwitch extends DataDevice {
  receiveFrame(frame: EthernetFrame): void {
    const datagram = frame.payload;
    if (!(datagram instanceof IPv4Packet)) {
      console.warn("Switches only forward IPv4 packets");
      return;
    }
    const dstDevice = this.datagraph.getDeviceByIP(datagram.destinationAddress);
    if (!dstDevice) {
      console.error("Destination device not found");
      return null;
    }
    const path = this.datagraph.getPathBetween(this.id, dstDevice.id);
    if (path.length < 2) {
      console.error("Destination device is not reachable");
      return;
    }
    const nextHopId = path[1];
    const nextHop = this.datagraph.getDevice(nextHopId);
    if (!nextHop) {
      console.error("Next hop not found");
      return;
    }
    const newFrame = new EthernetFrame(this.mac, nextHop.mac, datagram);
    // TODO: Belonging layer should be known
    sendRawPacket(this.datagraph, Layer.Network, this.id, newFrame, false);
  }

  getType(): DeviceType {
    return DeviceType.Switch;
  }
}
