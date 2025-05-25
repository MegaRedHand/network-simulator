import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { DataGraph, DataNode } from "../graphs/datagraph";
import { DeviceType, NetworkInterface } from "../view-devices/vDevice";
import { Position } from "../common";
import { IpAddress } from "../../packets/ip";

export abstract class DataDevice {
  private static idCounter = 1;

  id: number;
  x: number;
  y: number;
  datagraph: DataGraph;
  interfaces: NetworkInterface[] = [];
  tag: string;

  private static setIdCounter(id: number): void {
    if (id >= DataDevice.idCounter) {
      DataDevice.idCounter = id + 1;
    }
  }

  constructor(graphData: DataNode, datagraph: DataGraph) {
    this.x = graphData.x;
    this.y = graphData.y;
    if (graphData.id) {
      this.id = graphData.id;
      DataDevice.setIdCounter(graphData.id);
    } else {
      this.id = DataDevice.idCounter++;
    }
    graphData.interfaces.forEach((iface) => {
      this.interfaces.push({
        name: iface.name,
        mac: MacAddress.parse(iface.mac),
        ip: iface.ip !== undefined ? IpAddress.parse(iface.ip) : undefined,
      });
    });
    this.datagraph = datagraph;
    this.tag = graphData.tag;
  }

  static initializedIdCounter() {
    this.idCounter = 1;
  }

  getDataNode(): DataNode {
    return {
      id: this.id,
      type: this.getType(),
      x: this.x,
      y: this.y,
      interfaces: this.interfaces.map((iface) => ({
        name: iface.name,
        mac: iface.mac.toString(),
        ip: iface.ip !== undefined ? iface.ip.toString() : undefined,
      })),
      tag: this.getTag(),
    };
  }

  abstract getType(): DeviceType;

  getTag(): string {
    return this.tag;
  }

  ownMac(mac: MacAddress): boolean {
    return this.interfaces.some((iface) => iface.mac.equals(mac));
  }

  getPosition(): Position {
    return { x: this.x, y: this.y };
  }
  /**
   * Each type of device has different ways of handling a received packet.
   * Returns the id for the next device to send the packet to, or
   * null if there’s no next device to send the packet.
   * */
  abstract receiveFrame(frame: EthernetFrame, iface: number): void;
}
