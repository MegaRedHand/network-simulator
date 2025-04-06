import { Texture } from "pixi.js";
import { ICMP_PROTOCOL_NUMBER, IpAddress, IPv4Packet } from "../../packets/ip";
import { DeviceId } from "../graphs/datagraph";
import { ViewDevice } from "./vDevice";
import { ViewGraph } from "../graphs/viewgraph";
import { Position } from "../common";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { sendViewPacket, dropPacket } from "../packet";
import { EchoReply, EchoRequest } from "../../packets/icmp";
import { GlobalContext } from "../../context";

export abstract class ViewNetworkDevice extends ViewDevice {
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

  abstract receiveDatagram(packet: IPv4Packet): void;

  // TODO: Most probably it will be different for each type of device
  handlePacket(datagram: IPv4Packet) {
    console.debug("Packet has reach its destination!");
    const dstDevice = this.viewgraph.getDeviceByIP(datagram.sourceAddress);
    if (!(dstDevice instanceof ViewNetworkDevice)) {
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
            if (device instanceof ViewNetworkDevice) {
              dstMac = device.mac;
              break;
            }
          }
          const echoReply = new EchoReply(0);
          const ipPacket = new IPv4Packet(this.ip, dstDevice.ip, echoReply);
          const ethernet = new EthernetFrame(this.mac, dstMac, ipPacket);
          console.debug(`Sending EchoReply to ${dstDevice}`);
          sendViewPacket(this.viewgraph, this.id, ethernet);
        }
        break;
      }
      case 0xfd: {
        console.debug("Empty payload packet received!");
        break;
      }
      default:
        console.warn("Packet's type unrecognized");
    }
  }

  receiveFrame(frame: EthernetFrame, senderId: DeviceId): void {
    if (!this.mac.equals(frame.destination)) {
      dropPacket(this.viewgraph, this.id, frame);
      return;
    }
    if (!(frame.payload instanceof IPv4Packet)) {
      console.error("Packet's type not IPv4");
      dropPacket(this.viewgraph, this.id, frame);
      return;
    }
    const datagram = frame.payload;
    this.receiveDatagram(datagram);
  }
}
