import { Graphics, Point } from "pixi.js";
import { ViewGraph } from "./graphs/viewgraph";
import { ViewDevice } from "./view-devices/index"; // Import the Device class
import { deselectElement, selectElement, urManager } from "./viewportManager";
import { RightBar, StyledInfo } from "../graphics/right_bar";
import { Colors, ZIndexLevels } from "../utils/utils";
import { Packet } from "./packet";
import { RemoveEdgeMove } from "./undo-redo";
import { DataEdge, DeviceId } from "./graphs/datagraph";

export class Edge extends Graphics {
  private data: DataEdge;
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
    const rightbar = RightBar.getInstance();

    const from = this.data.from.id;
    const to = this.data.to.id;

    const info = new StyledInfo("Edge Information");
    info.addField("Connected Devices", `${from} <=> ${to}`);
    info.addField(
      "Start Position",
      `x=${this.startPos.x.toFixed(2)}, y=${this.startPos.y.toFixed(2)}`,
    );
    info.addField(
      "End Position",
      `x=${this.endPos.x.toFixed(2)}, y=${this.endPos.y.toFixed(2)}`,
    );

    // Calls renderInfo to display Edge information
    rightbar.renderInfo(info);

    rightbar.addButton(
      "Delete Edge",
      () => {
        const viewgraph = this.viewgraph;
        const move = new RemoveEdgeMove(viewgraph.getLayer(), from, to);

        urManager.push(viewgraph, move);
      },
      "right-bar-delete-button",
    );
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
