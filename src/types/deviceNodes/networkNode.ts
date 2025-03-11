import { Texture } from "pixi.js";
import { ICMP_PROTOCOL_NUMBER, IpAddress, IPv4Packet } from "../../packets/ip";
import { DeviceId } from "../graphs/datagraph";
import { DeviceNode } from "./deviceNode";
import { ViewGraph } from "../graphs/viewgraph";
import { Position } from "../common";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { Packet, sendRawPacket } from "../packet";
import { EchoReply, EchoRequest } from "../../packets/icmp";
import { GlobalContext } from "../../context";

export abstract class NetworkNode extends DeviceNode {
  ip: IpAddress;
  ipMask: IpAddress;

  constructor(
    id: DeviceId,
    texture: Texture,
    viewgraph: ViewGraph,
    ctx: GlobalContext,
    position: Position,
    mac: MacAddress,
    ip: IpAddress,
    ipMask: IpAddress,
  ) {
    super(id, texture, viewgraph, ctx, position, mac);
    this.ip = ip;
    this.ipMask = ipMask;
  }

  abstract receiveDatagram(packet: Packet): Promise<DeviceId | null>;

  // TODO: Most probably it will be different for each type of device
  handlePacket(datagram: IPv4Packet) {
    const dstDevice = this.viewgraph.getDeviceByIP(datagram.sourceAddress);
    if (!(dstDevice instanceof NetworkNode)) {
      return;
    }
    switch (datagram.payload.protocol()) {
      case ICMP_PROTOCOL_NUMBER: {
        const request: EchoRequest = datagram.payload as EchoRequest;
        if (dstDevice && request.type) {
          const path = this.viewgraph.getPathBetween(this.id, dstDevice.id);
          let dstMac = dstDevice.mac;
          if (!path) return;
          console.log(path);
          for (const id of path.slice(1)) {
            const device = this.viewgraph.getDevice(id);
            if (device instanceof NetworkNode) {
              dstMac = device.mac;
              break;
            }
          }
          const echoReply = new EchoReply(0);
          const ipPacket = new IPv4Packet(this.ip, dstDevice.ip, echoReply);
          const ethernet = new EthernetFrame(this.mac, dstMac, ipPacket);
          sendRawPacket(this.viewgraph, this.id, dstDevice.id, ethernet);
        }
        break;
      }
      default:
        console.warn("Packet's type unrecognized");
    }
  }

  async receivePacket(packet: Packet): Promise<DeviceId | null> {
    const frame = packet.rawPacket;
    if (this.mac.equals(frame.destination)) {
      return this.receiveDatagram(packet);
    }
    return null;
  }
}
