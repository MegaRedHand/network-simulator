import { Texture } from "pixi.js";
import {
  ICMP_PROTOCOL_NUMBER,
  IpAddress,
  IPv4Packet,
  TCP_PROTOCOL_NUMBER,
} from "../../packets/ip";
import { DeviceId, NetworkInterfaceData } from "../graphs/datagraph";
import { NetworkInterface, ViewDevice } from "./vDevice";
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

interface ForwardingData {
  src: {
    ip: IpAddress;
    mac: MacAddress;
  };
  dst: {
    ip: IpAddress;
    mac: MacAddress;
  };
  sendingIface: number;
}

export abstract class ViewNetworkDevice extends ViewDevice {
  ipMask: IpAddress;

  constructor(
    id: DeviceId,
    texture: Texture,
    viewgraph: ViewGraph,
    ctx: GlobalContext,
    position: Position,
    interfaces: NetworkInterfaceData[],
    ipMask: IpAddress,
  ) {
    super(id, texture, viewgraph, ctx, position, interfaces);
    this.ipMask = ipMask;
  }

  // TODO MAC-IP: Borrar la funcion e intentar manejar las direcciones de otra manera
  /**
   * Gets all the necessary data to forward a packet, including the addresses used
   * to craft the packet and the first interface that will receive the packet
   * @param srcId Id of the device forwarding the packet
   * @param dstId Id of the destination device
   * @param viewgraph `Viewgraph` of the network
   * @returns A `ForwardingData` instance containg all data necessary to forward a packet
   */
  static getForwardingData(
    srcId: DeviceId,
    dstId: DeviceId,
    viewgraph: ViewGraph,
  ): ForwardingData {
    // Get path
    const path = viewgraph.getPathBetween(srcId, dstId);
    if (!path) return;
    // Get sendingIface
    const nextHopId = path[1];
    const nextEdge = viewgraph.getEdge(srcId, nextHopId);
    const sendingIface = nextEdge.getDeviceInterface(srcId);
    // Get source data
    const srcDevice = viewgraph.getDevice(srcId);
    const srcIface = srcDevice.interfaces[sendingIface];
    // Get destination data
    const lastEdge = viewgraph.getEdge(path[path.length - 2], dstId);
    const receivingIface = lastEdge.getDeviceInterface(dstId);
    const dstDevice = viewgraph.getDevice(dstId);
    const dstIface = dstDevice.interfaces[receivingIface];
    // Get dstMac
    let dstMac: MacAddress = dstIface.mac;
    for (const idx of path.slice(1).keys()) {
      console.debug(`Iterando en indice: ${idx}`);
      const [sendingId, receivingId] = [path[idx], path[idx + 1]];
      console.debug(
        `Se obtienen los devices con ids ${sendingId} y ${receivingId}`,
      );
      const receivingDevice = viewgraph.getDevice(receivingId);
      if (receivingDevice instanceof ViewNetworkDevice) {
        const edge = viewgraph.getEdge(sendingId, receivingId);
        const receivingIface = edge.getDeviceInterface(receivingId);
        dstMac = receivingDevice.interfaces[receivingIface].mac;
        break;
      }
    }
    const forwardingData = {
      src: { mac: srcIface.mac, ip: srcIface.ip },
      dst: { mac: dstMac, ip: dstIface.ip },
      sendingIface,
    };
    return forwardingData;
  }

  abstract receiveDatagram(packet: IPv4Packet, iface: number): void;

  ownIp(ip: IpAddress): boolean {
    return this.interfaces.some((iface) => iface.ip?.equals(ip));
  }

  updateArpTable(mac: MacAddress, ip: IpAddress) {
    console.debug(`Setting ${ip.toString()} resolution to ${mac.toString()}`);
    this.viewgraph.getDataGraph().modifyDevice(this.id, (device) => {
      if (!device) {
        console.error(`Device with id ${this.id} not found in datagraph`);
        return;
      }
      if (device instanceof DataNetworkDevice) {
        device.updateArpTable(mac, ip);
      }
    });
  }

  resolveAddress(ip: IpAddress): MacAddress {
    const dDevice = this.viewgraph.getDataGraph().getDevice(this.id);
    if (!dDevice || !(dDevice instanceof DataNetworkDevice)) {
      console.warn(`Device with id ${this.id} not found in datagraph`);
      return;
    }
    const arpTable = dDevice.arpTable;
    if (!arpTable.has(ip.toString())) {
      // As ip addr isn't in the table, then the 'entry' in device table never was modified.
      // The mac addr of the device that has the ip addr should be returned.
      const device = this.viewgraph.getDeviceByIP(ip);
      if (!device) {
        console.warn(`Device with ip ${ip.toString()} not found in DataGraph`);
        return undefined;
      }
      const iface = device.interfaces.find((iface) => iface.ip?.equals(ip));
      return iface ? iface.mac : undefined;
    }
    // There is an entry with key=ip.
    // This means either the entry has the address resolution expected or
    // the entry has "", then the entry was previously deleted.
    const mac = arpTable.get(ip.toString());
    return mac != "" ? MacAddress.parse(mac) : undefined;
  }

  // TODO: Most probably it will be different for each type of device
  handleDatagram(datagram: IPv4Packet, iface: number) {
    console.debug("Packet has reach its destination!");
    const dstDevice = this.viewgraph.getDeviceByIP(datagram.sourceAddress);
    if (!(dstDevice instanceof ViewNetworkDevice)) {
      return;
    }
    switch (datagram.payload.protocol()) {
      case ICMP_PROTOCOL_NUMBER: {
        const request: EchoRequest = datagram.payload as EchoRequest;
        if (dstDevice && request.type) {
          const { src, dst, sendingIface } =
            ViewNetworkDevice.getForwardingData(
              this.id,
              dstDevice.id,
              this.viewgraph,
            );
          const [srcMac, srcIp] = [src.mac, src.ip];
          const [dstMac, dstIp] = [dst.mac, dst.ip];
          const echoReply = new EchoReply(0);
          const ipPacket = new IPv4Packet(
            srcIp /*ip de mi iface  A*/,
            dstIp /*ip de la iface del destino */,
            echoReply,
          );
          const frame = new EthernetFrame(
            srcMac /*mac de mi iface A*/,
            dstMac /*mac de la iface del primer network device B*/,
            ipPacket,
          );
          console.debug(`Sending EchoReply to ${dstDevice}`);
          sendViewPacket(
            this.viewgraph,
            this.id,
            frame,
            sendingIface /*iface por donde se va a mandar el paquete C*/,
          );
        }
        break;
      }
      case TCP_PROTOCOL_NUMBER: {
        // For the moment
        return;
      }
      default:
    }
  }

  handleArpPacket(packet: ArpPacket, iface: number) {
    const { sha, spa, tha, tpa } = packet;
    const { mac, ip } = this.interfaces[iface];
    if (packet.op === ARP_REQUEST_CODE) {
      // NOTE: We don’t take into account htype, ptype, hlen and plen,
      // as they always will be MAC Address and IP address
      // Check if tpa is device ip
      if (!tpa.equals(ip)) {
        // drop packet
        const frame = new EthernetFrame(mac, sha, packet);
        dropPacket(this.viewgraph, this.id, frame);
        return;
      }
      // Send an ARP Reply to the requesting device
      const reply = new ArpReply(mac, tpa, spa, sha);
      const frame = new EthernetFrame(mac, sha, reply);
      sendViewPacket(this.viewgraph, this.id, frame);
    } else if (packet.op === ARP_REPLY_CODE) {
      // Check if the reply was actually sent to device
      if (!tha.equals(mac) && tpa.equals(ip)) {
        // drop packet
        const frame = new EthernetFrame(mac, sha, packet);
        dropPacket(this.viewgraph, this.id, frame);
        return;
      }
      this.updateArpTable(sha, spa);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  receiveFrame(frame: EthernetFrame, iface: number): void {
    const { mac } = this.interfaces[iface];
    if (!mac.equals(frame.destination) && !frame.destination.isBroadcast()) {
      dropPacket(this.viewgraph, this.id, frame);
      return;
    }
    if (frame.payload instanceof IPv4Packet) {
      const datagram = frame.payload;
      this.receiveDatagram(datagram, iface);
      return;
    }
    if (frame.payload instanceof ArpPacket) {
      const packet = frame.payload;
      this.handleArpPacket(packet, iface);
      return;
    }
    console.error("Packet's type not IPv4");
    dropPacket(this.viewgraph, this.id, frame);
  }
}
