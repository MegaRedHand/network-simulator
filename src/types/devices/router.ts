import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DeviceId, isRouter } from "../graphs/datagraph";
import { Packet } from "../packet";
import { NetworkDevice } from "./networkDevice";

export class Router extends NetworkDevice {
  private packetQueueSize = 0;
  private maxQueueSize = 5;
  private timePerPacket = 1000;
  viewgraph: any;

  async routePacket(datagram: IPv4Packet): Promise<DeviceId | null> {
    const device = this.datagraph.getDevice(this.id);
    if (!device || !isRouter(device)) {
      return null;
    }
    if (this.packetQueueSize >= this.maxQueueSize) {
      console.debug("Packet queue full, dropping packet");
      return null;
    }
    this.packetQueueSize += 1;
    console.debug("Processing packet, queue size:", this.packetQueueSize);
    await new Promise((resolve) => setTimeout(resolve, this.timePerPacket));
    this.packetQueueSize -= 1;

    const result = device.routingTable.find((entry) => {
      if (entry.deleted) {
        console.log("Skipping deleted entry:", entry);
        return false;
      }
      const ip = IpAddress.parse(entry.ip);
      const mask = IpAddress.parse(entry.mask);
      console.log("Considering entry:", entry);
      return datagram.destinationAddress.isInSubnet(ip, mask);
    });
    console.log("Result:", result);
    return result === undefined ? null : result.iface;
  }

  async receiveDatagram(packet: Packet): Promise<DeviceId | null> {
    const datagram = packet.rawPacket.payload;
    if (!(datagram instanceof IPv4Packet)) {
      return null;
    }
    if (this.ip.equals(datagram.destinationAddress)) {
      this.handlePacket(datagram);
      return null;
    }
    // a router changed forward datagram to destination, have to change current destination mac
    const dstDevice = this.viewgraph.getDeviceByIP(datagram.destinationAddress);
    if (!dstDevice) {
      console.error("Destination device not found");
      return null;
    }
    const path = this.viewgraph.getPathBetween(this.id, dstDevice.id);
    let dstMac = dstDevice.mac;
    if (!path) return null;
    for (const id of path.slice(1)) {
      const device = this.viewgraph.getDevice(id);
      if (device instanceof NetworkDevice) {
        dstMac = device.mac;
        break;
      }
    }
    packet.rawPacket.destination = dstMac;
    return this.routePacket(datagram);
  }
}
