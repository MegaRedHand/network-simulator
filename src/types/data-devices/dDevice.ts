import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { DataGraph, DataNode } from "../graphs/datagraph";
import { DeviceType } from "../view-devices/vDevice";
import { Position } from "../common";

export abstract class DataDevice {
  private static idCounter = 1;

  id: number;
  x: number;
  y: number;
  mac: MacAddress;
  datagraph: DataGraph;

  private static setIdCounter(id: number): void {
    if (id >= DataDevice.idCounter) {
      DataDevice.idCounter = id + 1;
    }
  }

  constructor(graphData: DataNode, datagraph: DataGraph) {
    this.x = graphData.x;
    this.y = graphData.y;
    this.mac = MacAddress.parse(graphData.mac);
    if (graphData.id) {
      this.id = graphData.id;
      DataDevice.setIdCounter(graphData.id);
    } else {
      this.id = DataDevice.idCounter++;
    }
    this.datagraph = datagraph;
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
      mac: this.mac.toString(),
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
  abstract receiveFrame(frame: EthernetFrame): void;
}
