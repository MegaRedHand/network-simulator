import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { EchoReply, EchoRequest } from "../../packets/icmp";
import { ICMP_PROTOCOL_NUMBER, IpAddress, IPv4Packet } from "../../packets/ip";
import {
  DataGraph,
  DeviceId,
  DataNode,
  NetworkDataNode,
} from "../graphs/datagraph";
import { Packet, sendRawPacket } from "../packet";
import { Device } from "./device";

export abstract class NetworkDevice extends Device {
  ip: IpAddress;
  ipMask: IpAddress;

  constructor(graphData: NetworkDataNode, datagraph: DataGraph) {
    super(graphData, datagraph);
    this.ip = IpAddress.parse(graphData.ip);
    this.ipMask = IpAddress.parse(graphData.mask);
  }

  getDataNode(): DataNode {
    return {
      ...super.getDataNode(),
      mac: this.mac.toString(),
      ip: this.ip.toString(),
      mask: this.ipMask.toString(),
    };
  }

  abstract receiveDatagram(packet: Packet): Promise<DeviceId | null>;

  // TODO: Most probably it will be different for each type of device
  handlePacket(datagram: IPv4Packet) {
    const dstDevice: Device = this.datagraph.getDeviceByIP(
      datagram.sourceAddress,
    );
    if (!(dstDevice instanceof NetworkDevice)) {
      return;
    }
    switch (datagram.payload.protocol()) {
      case ICMP_PROTOCOL_NUMBER: {
        const request: EchoRequest = datagram.payload as EchoRequest;
        if (dstDevice && request.type) {
          const path = this.datagraph.getPathBetween(this.id, dstDevice.id);
          let dstMac = dstDevice.mac;
          if (!path) return;
          console.log(path);
          for (const id of path.slice(1)) {
            const device = this.datagraph.getDevice(id);
            if (device instanceof NetworkDevice) {
              dstMac = device.mac;
              break;
            }
          }
          const echoReply = new EchoReply(0);
          const ipPacket = new IPv4Packet(this.ip, dstDevice.ip, echoReply);
          const ethernet = new EthernetFrame(this.mac, dstMac, ipPacket);
          // sendRawPacket(this.datagraph, this.id, dstDevice.id, ethernet);
        }
        break;
      }
      default:
        console.warn("Packet's type unrecognized");
    }
  }

  async receivePacket(packet: Packet): Promise<DeviceId | null> {
    const frame = packet.rawPacket;
    console.debug(
      `Dispositivo ${this.mac.toString()} recibe frame con destino ${frame.destination.toString()}`,
    );
    if (this.mac.equals(frame.destination)) {
      return this.receiveDatagram(packet);
    }
    return null;
  }
}
