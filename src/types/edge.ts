import { Graphics, Point } from "pixi.js";
import { ViewGraph } from "./graphs/viewgraph";
import { ViewDevice } from "./view-devices/index"; // Import the Device class
import { deselectElement, selectElement } from "./viewportManager";
import { RightBar } from "../graphics/right_bar";
import { Colors, ZIndexLevels } from "../utils/utils";
import { Packet } from "./packet";
import { EdgeInfo } from "../graphics/renderables/edge_info";
import { DataEdge, DeviceId } from "./graphs/datagraph";

export class Edge extends Graphics {
  data: DataEdge;
  private startPos: Point;
  private endPos: Point;

  viewgraph: ViewGraph;

  constructor(viewgraph: ViewGraph, edgeData: DataEdge) {
    super();
    this.data = edgeData;
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

    // Draw a colored line
    this.moveTo(startPos.x, startPos.y);
    this.lineTo(endPos.x, endPos.y);
    this.stroke({ width: 4, color });

    // Add a bigger transparent hitbox
    this.moveTo(startPos.x, startPos.y);
    this.lineTo(endPos.x, endPos.y);
    this.stroke({ width: 12, alpha: 0 });

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

  // Method to delete the edge
  delete() {
    // Remove the edge from the viewgraph and datagraph
    const n1 = this.data.from.id;
    const n2 = this.data.to.id;
    this.viewgraph.removeEdge(n1, n2);
    console.log(`Edge ${n1},${n2} deleted.`);
    this.destroy();
  }

  destroy(): DataEdge {
    deselectElement();
    super.destroy();
    return this.data;
  }

  makeVisible() {
    this.visible = true;
  }

  updateVisibility(): void {
    const device1 = this.viewgraph.getDevice(this.data.from.id);
    const device2 = this.viewgraph.getDevice(this.data.to.id);

    if (!device1 || !device2) {
      console.warn(
        `One or both devices for edge ${this.data.from.id} ↔ ${this.data.to.id} are missing.`,
      );
      this.visible = false;
      return;
    }

    // Get visible devices reachable from each device
    const device1CanReachVisibleDevice = this.viewgraph.canReachVisibleDevice(
      device1.id,
      device2.id,
    );
    const device2CanReachVisibleDevice = this.viewgraph.canReachVisibleDevice(
      device2.id,
      device1.id,
    );

    // Update the visibility of the edge
    this.visible = device1CanReachVisibleDevice && device2CanReachVisibleDevice;
  }

  /**
   * Updates the position of an edge connecting two devices, taking into account their visibility
   * and dimensions. If a device is visible, the edge will leave a space around the device's center
   * to account for its size. Otherwise, the edge will connect directly to the device's position.
   *
   * @param device1 - The first device (starting point of the edge).
   * @param device2 - The second device (ending point of the edge).
   */
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
}
