import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { EchoReply, EchoRequest } from "../../packets/icmp";
import { ICMP_PROTOCOL_NUMBER, IpAddress, IPv4Packet } from "../../packets/ip";
import { Packet, sendRawPacket } from "../packet";
import { DataGraph, DeviceId } from "../graphs/datagraph";

export abstract class Device {
  static idCounter: number = 0;

  id: number;
  x: number;
  y: number;
  mac: MacAddress;
  datagraph: DataGraph;
  connections: Set<DeviceId> = new Set<DeviceId>();

  constructor(
    x: number,
    y: number,
    mac: MacAddress,
    datagraph: DataGraph,
    id?: number,
  ) {
    this.x = x;
    this.y = y;
    this.mac = mac;
    this.datagraph = datagraph;
    this.id = id ?? Device.idCounter++;
  }

  addConnection(adjId: DeviceId) {
    this.connections.add(adjId);
  }

  /**
   * Each type of device has different ways of handling a received packet.
   * Returns the id for the next device to send the packet to, or
   * null if there’s no next device to send the packet.
   * */
  // TODO: Might be general for all device in the future.
  abstract receivePacket(packet: Packet): Promise<DeviceId | null>;
}
