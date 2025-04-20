import { Texture } from "pixi.js";
import { ICMP_PROTOCOL_NUMBER, IpAddress, IPv4Packet } from "../../packets/ip";
import { DeviceId, NetworkInterfaceData } from "../graphs/datagraph";
import { ViewDevice } from "./vDevice";
import { ViewGraph } from "../graphs/viewgraph";
import { Position } from "../common";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { sendViewPacket, dropPacket } from "../packet";
import { EchoReply, EchoRequest } from "../../packets/icmp";
import { GlobalContext } from "../../context";
import {
  ARP_REPLY_CODE,
  ARP_REQUEST_CODE,
  ArpPacket,
  ArpReply,
} from "../../packets/arp";
import { DataNetworkDevice } from "../data-devices";

export abstract class ViewNetworkDevice extends ViewDevice {
  ip: IpAddress;
  ipMask: IpAddress;
  arpTable: Map<string, string>;

  constructor(
    id: DeviceId,
    texture: Texture,
    viewgraph: ViewGraph,
    ctx: GlobalContext,
    position: Position,
    mac: MacAddress,
    interfaces: NetworkInterfaceData[],
    ip: IpAddress,
    ipMask: IpAddress,
    arpTable: Map<string, string>,
  ) {
    super(id, texture, viewgraph, ctx, position, mac, interfaces);
    this.ip = ip;
    this.ipMask = ipMask;
    this.arpTable = arpTable;
  }

  abstract receiveDatagram(packet: IPv4Packet): void;

  updateArpTable(mac: MacAddress, ip: IpAddress) {
    const dDevice = this.viewgraph.getDataGraph().getDevice(this.id);
    if (!dDevice || !(dDevice instanceof DataNetworkDevice)) {
      console.warn(`Device with id ${this.id} not found in datagraph`);
      return;
    }
    const arpTable = dDevice.arpTable;
    console.debug(`Setting ${ip.toString()} resolution to ${mac.toString()}`);
    arpTable.set(ip.toString(), mac.toString());
    this.viewgraph.getDataGraph().modifyDevice(this.id, (device) => {
      if (device instanceof DataNetworkDevice) {
        device.updateArpTable(mac, ip);
      }
    });
  }

  // TODO: Most probably it will be different for each type of device
  handleDatagram(datagram: IPv4Packet) {
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
          for (const id of path.slice(1)) {
            const device = this.viewgraph.getDevice(id);
            if (device instanceof ViewNetworkDevice) {
              dstMac = device.mac;
              break;
            }
          }
          const echoReply = new EchoReply(0);
          const ipPacket = new IPv4Packet(this.ip, dstDevice.ip, echoReply);
          const frame = new EthernetFrame(this.mac, dstMac, ipPacket);
          console.debug(`Sending EchoReply to ${dstDevice}`);
          sendViewPacket(this.viewgraph, this.id, frame);
        }
        break;
      }
      default:
        console.warn("Packet's type unrecognized");
    }
  }

  handleArpPacket(packet: ArpPacket) {
    console.debug("Entro a handlear el paquete");
    const { sha, spa, tha, tpa } = packet;
    if (packet.op === ARP_REQUEST_CODE) {
      // NOTE: We don’t take into account htype, ptype, hlen and plen,
      // as they always will be MAC Address and IP address
      // Check if tpa is device ip
      if (!tpa.equals(this.ip)) {
        // drop packet
        return;
      }
      // Send an ARP Reply to the requesting device
      const reply = new ArpReply(this.mac, tpa, spa, sha);
      const frame = new EthernetFrame(this.mac, sha, reply);
      sendViewPacket(this.viewgraph, this.id, frame);
    } else if (packet.op === ARP_REPLY_CODE) {
      // Check if the reply was actually sent to device
      if (!tha.equals(this.mac) && tpa.equals(this.ip)) {
        // drop packet
        return;
      }
      this.updateArpTable(sha, spa);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  receiveFrame(frame: EthernetFrame, _: DeviceId): void {
    if (
      !this.mac.equals(frame.destination) &&
      !frame.destination.isBroadcast()
    ) {
      console.debug("entro aca");
      dropPacket(this.viewgraph, this.id, frame);
      return;
    }
    if (frame.payload instanceof IPv4Packet) {
      const datagram = frame.payload;
      this.receiveDatagram(datagram);
      return;
    }
    if (frame.payload instanceof ArpPacket) {
      const packet = frame.payload;
      this.handleArpPacket(packet);
      return;
    }
    console.error("Packet's type not IPv4");
    dropPacket(this.viewgraph, this.id, frame);
  }
}
