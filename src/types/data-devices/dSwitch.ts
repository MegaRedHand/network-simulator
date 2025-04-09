import { DeviceType } from "../view-devices/vDevice";
import { DataDevice } from "./dDevice";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { DeviceId } from "../graphs/datagraph";
import { sendViewPacket } from "../packet";

export class DataSwitch extends DataDevice {
  //                      would be interface
  switchingTable: Map<string, DeviceId> = new Map<string, DeviceId>();

  getType(): DeviceType {
    return DeviceType.Switch;
  }

  updateSwitchingTable(mac: MacAddress, deviceId: DeviceId): void {
    if (!this.switchingTable.has(mac.toString())) {
      console.debug(`Adding ${mac.toString()} to the switching table`);
      this.switchingTable.set(mac.toString(), deviceId);
    }
  }

  private forwardFrame(
    frame: EthernetFrame,
    nextHopId: DeviceId, // will be the interface where to send the packet
    senderId: DeviceId, // will be the interface where the packet came from
  ) {
    if (nextHopId === senderId) {
      // Packet would be sent to the interface where it came, discard it
      return;
    }
    const nextHop = this.datagraph.getDevice(nextHopId);
    if (!nextHop) {
      console.warn(`Next hop with id ${nextHopId} not found`);
      return;
    }

    // As this is a switch, frame.destination should already be
    // the mac of the next network device to receive the packet
    const newFrame = new EthernetFrame(
      this.mac,
      frame.destination,
      frame.payload,
    );
    console.debug(
      `Forwarding frame from ${this.mac.toString()} to ${nextHop.mac.toString()}`,
    );
    sendViewPacket(
      this.datagraph.ctx.getViewGraph(),
      this.id,
      newFrame,
      nextHopId,
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  receiveFrame(frame: EthernetFrame): void {
    // TODO: this is unused
  }

  // // TODO: change all related senderId features to the receiver interface
  // receiveFrame(frame: EthernetFrame, senderId: DeviceId): void {
  //   const datagram = frame.payload;
  //   if (!(datagram instanceof IPv4Packet)) {
  //     console.warn("Switches only forward IPv4 packets");
  //     return;
  //   }
  //   // Update the switching table with the source MAC address
  //   this.updateSwitchingTable(frame.source, senderId);
  //   console.debug(
  //     `Looking for ${frame.destination.toString()} in the switching table`,
  //   );
  //   // If the destination MAC address is in the switching table, send the frame
  //   // to the corresponding device
  //   // If the destination MAC address is not in the switching table, send the frame
  //   // to all devices connected to the switch
  //   const nextHops: DeviceId[] = this.switchingTable.has(
  //     frame.destination.toString(),
  //   )
  //     ? [this.switchingTable.get(frame.destination.toString())]
  //     : this.datagraph.getConnections(this.id);
  //   nextHops.forEach((nextHopId) => {
  //     this.forwardFrame(frame, nextHopId, senderId);
  //   });
  // }
}
