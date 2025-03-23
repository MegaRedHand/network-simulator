import { MacAddress } from "../../packets/ethernet";
import { Packet, sendRawPacket } from "../packet";
import { DataGraph, DeviceId, DataNode } from "../graphs/datagraph";
import { DeviceType } from "../deviceNodes/deviceNode";
import { Position } from "../common";

export abstract class Device {
  static idCounter: number = 1;

  id: number;
  x: number;
  y: number;
  mac: MacAddress;
  datagraph: DataGraph;

  constructor(graphData: DataNode, datagraph: DataGraph) {
    this.x = graphData.x;
    this.y = graphData.y;
    this.mac = MacAddress.parse(graphData.mac);
    this.id = graphData.id ?? Device.idCounter++;
    this.datagraph = datagraph;
  }

  getDataNode(): DataNode {
    return {
      id: this.id,
      type: this.getType(),
      x: this.x,
      y: this.y,
      mac: this.mac.toString(),
      connections: this.datagraph.getConnections(this.id),
    };
  }

  abstract getType(): DeviceType;

  getPosition(): Position {
    return { x: this.x, y: this.y };
  }
  /**
   * Each type of device has different ways of handling a received packet.
   * Returns the id for the next device to send the packet to, or
   * null if there’s no next device to send the packet.
   * */
  // TODO: Might be general for all device in the future.
  abstract receivePacket(packet: Packet): Promise<DeviceId | null>;
}
