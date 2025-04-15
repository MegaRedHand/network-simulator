import { Graphics, Point } from "pixi.js";
import { ViewGraph } from "./graphs/viewgraph";
import { ViewDevice } from "./view-devices/index"; // Import the Device class
import { deselectElement, selectElement } from "./viewportManager";
import { RightBar } from "../graphics/right_bar";
import { Colors, ZIndexLevels } from "../utils/utils";
import { Packet } from "./packet";
import { EdgeInfo } from "../graphics/renderables/edge_info";
import { DataEdge, DeviceId } from "./graphs/datagraph";
import { MacAddress } from "../packets/ethernet";

export class Edge extends Graphics {
  private _data: DataEdge;
  private startPos: Point;
  private endPos: Point;

  viewgraph: ViewGraph;

  // This is to always have the same data as the datagraph
  get data(): DataEdge {
    return this.viewgraph
      .getDataGraph()
      .getConnection(this._data.from.id, this._data.to.id);
  }

  constructor(viewgraph: ViewGraph, edgeData: DataEdge) {
    super();
    this._data = edgeData;
    this.viewgraph = viewgraph;

    this.eventMode = "static";
    this.interactive = true;
    this.cursor = "pointer";
    this.on("click", () => selectElement(this));
    // NOTE: this is "click" for mobile devices
    this.on("tap", () => selectElement(this));

    this.refresh();
  }

  /**
   * Recomputes the edge's position based on the connected devices.
   */
  refresh() {
    const n1 = this.data.from.id;
    const n2 = this.data.to.id;
    const device1 = this.viewgraph.getDevice(n1);
    const device2 = this.viewgraph.getDevice(n2);
    this.updatePosition(device1, device2);
  }

  nodePosition(nodeId: DeviceId): Point | undefined {
    return this.data.from.id === nodeId
      ? this.startPos
      : this.data.to.id === nodeId
        ? this.endPos
        : undefined;
  }

  getDeviceIds(): DeviceId[] {
    return [this.data.from.id, this.data.to.id];
  }

  otherEnd(nodeId: DeviceId): DeviceId | undefined {
    return this.data.from.id === nodeId
      ? this.data.to.id
      : this.data.to.id === nodeId
        ? this.data.from.id
        : undefined;
  }

  getData(): DataEdge {
    return this.data;
  }

  // Method to draw the line
  drawEdge(startPos: Point, endPos: Point, color: number) {
    this.clear();
    this.moveTo(startPos.x, startPos.y);
    this.lineTo(endPos.x, endPos.y);
    this.stroke({ width: 3, color });
    this.zIndex = ZIndexLevels.Edge;
    this.startPos = startPos;
    this.endPos = endPos;

    this.children.forEach((child) => {
      if (child instanceof Packet) {
        child.updatePosition();
      }
    });
  }

  select() {
    this.highlight();
    this.showInfo();
  }

  deselect() {
    this.removeHighlight();
  }

  highlight() {
    this.drawEdge(this.startPos, this.endPos, Colors.Violet);
  }

  removeHighlight() {
    this.drawEdge(this.startPos, this.endPos, Colors.Lightblue);
  }

  // Method to show the Edge information
  showInfo() {
    const edgeInfo = new EdgeInfo(this);
    RightBar.getInstance().renderInfo(edgeInfo);
  }

  destroy(): void {
    deselectElement();
    super.destroy();
  }

  private updatePosition(device1: ViewDevice, device2: ViewDevice) {
    const dx = device2.x - device1.x;
    const dy = device2.y - device1.y;
    const angle = Math.atan2(dy, dx);

    const n1IsVisible = device1.visible;
    const n2IsVisible = device2.visible;

    const offsetX1 = n1IsVisible
      ? ((device1.width + 5) / 2) * Math.cos(angle)
      : 0;
    const offsetY1 = n1IsVisible
      ? ((device1.height + 5) / 2) * Math.sin(angle)
      : 0;
    const offsetX2 = n2IsVisible
      ? ((device2.width + 5) / 2) * Math.cos(angle)
      : 0;
    const offsetY2 = n2IsVisible
      ? ((device2.height + 5) / 2) * Math.sin(angle)
      : 0;

    const newStartPos: Point = new Point(
      device1.x + offsetX1,
      device1.y + offsetY1,
    );
    const newEndPos: Point = new Point(
      device2.x - offsetX2,
      device2.y - offsetY2,
    );

    this.drawEdge(newStartPos, newEndPos, Colors.Lightblue);
  }

  setInterface(deviceId: DeviceId, iface: number) {
    if (this.data.from.id === deviceId) {
      this.data.from.iface = iface;
    } else {
      this.data.to.iface = iface;
    }
    this.viewgraph.getDataGraph().regenerateAllRoutingTables();
  }

  setInterfaceMac(deviceId: DeviceId, mac: string): void {
    let iface;
    if (this.data.from.id === deviceId) {
      iface = this.data.from.iface;
    } else {
      iface = this.data.to.iface;
    }
    const device = this.viewgraph.getDataGraph().getDevice(deviceId);

    if (!device) {
      console.error(`Device with ID ${deviceId} not found.`);
      return;
    }
    device.interfaces[iface].mac = MacAddress.parse(mac);
    console.log(
      `Updated MAC address for device ${deviceId}, interface ${iface}: ${mac}`,
    );
  }

  getDeviceFreeIfaces(deviceId: DeviceId): number[] {
    const freeIfaces = this.viewgraph
      .getDataGraph()
      .getFreeInterfaces(deviceId);
    return freeIfaces;
  }
}
