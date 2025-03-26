// MARCADO V1
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { EchoReply, EchoRequest } from "../../packets/icmp";
import { ICMP_PROTOCOL_NUMBER, IpAddress, IPv4Packet } from "../../packets/ip";
import {
  DataGraph,
  DeviceId,
  DataNode,
  NetworkDataNode,
} from "../graphs/datagraph";
import { Layer } from "../layer";
import { Packet, sendRawPacket } from "../packet";
import { DataDevice } from "./dDevice";

export abstract class DataNetworkDevice extends DataDevice {
  ip: IpAddress;
  ipMask: IpAddress;

  constructor(graphData: NetworkDataNode, datagraph: DataGraph) {
    super(graphData, datagraph);
    this.ip = IpAddress.parse(graphData.ip);
    this.ipMask = IpAddress.parse(graphData.mask);
  }

  getDataNode(): NetworkDataNode {
    return {
      ...super.getDataNode(),
      ip: this.ip.toString(),
      mask: this.ipMask.toString(),
    };
  }

  abstract receiveDatagram(datagram: IPv4Packet): void;

  // TODO: Most probably it will be different for each type of device
  handlePacket(datagram: IPv4Packet) {
    console.debug("Packet has reach its destination!");
    const dstDevice: DataDevice = this.datagraph.getDeviceByIP(
      datagram.sourceAddress,
    );
    if (!(dstDevice instanceof DataNetworkDevice)) {
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
            if (device instanceof DataNetworkDevice) {
              dstMac = device.mac;
              break;
            }
          }
          const echoReply = new EchoReply(0);
          const ipPacket = new IPv4Packet(this.ip, dstDevice.ip, echoReply);
          const ethernet = new EthernetFrame(this.mac, dstMac, ipPacket);
          // TODO: Belonging layer should be known
          sendRawPacket(
            this.datagraph,
            Layer.Network,
            this.id,
            ethernet,
            false,
          );
        }
        break;
      }
      default:
        console.warn("Packet's type unrecognized");
    }
  }

  receiveFrame(frame: EthernetFrame): void {
    console.debug(
      `Dispositivo ${this.mac.toString()} recibe frame con destino ${frame.destination.toString()}`,
    );
    if (!(frame.payload instanceof IPv4Packet)) {
      console.warn("Frame's payload is not an IPv4Packet");
      return null;
    }
    if (this.mac.equals(frame.destination)) {
      return this.receiveDatagram(frame.payload);
    }
    return null;
  }
}
