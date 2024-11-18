import { Graphics, Point } from "pixi.js";
import { ViewGraph } from "./graphs/viewgraph";
import { Device } from "./devices/index"; // Import the Device class
import { deselectElement, selectElement } from "./viewportManager";
import { RightBar, StyledInfo } from "../graphics/right_bar";
import { Colors, ZIndexLevels } from "../utils";
import { Packet } from "./packet";

export interface EdgeEdges {
  n1: number;
  n2: number;
}

export class Edge extends Graphics {
  id: number;
  connectedNodes: { n1: number; n2: number };
  startPos: Point;
  endPos: Point;
  viewgraph: ViewGraph;
  rightbar: RightBar;

  constructor(
    id: number,
    connectedNodes: EdgeEdges,
    device1: Device,
    device2: Device,
    viewgraph: ViewGraph,
  ) {
    super();

    this.id = id;
    this.connectedNodes = connectedNodes;
    this.viewgraph = viewgraph;
    this.rightbar = RightBar.getInstance();

    this.updatePosition(device1, device2);

    this.eventMode = "static";
    this.interactive = true;
    this.cursor = "pointer";
    this.on("click", () => selectElement(this));
  }

  nodePosition(nodeId: number): Point | undefined {
    return this.connectedNodes.n1 === nodeId
      ? this.startPos
      : this.connectedNodes.n2 === nodeId
        ? this.endPos
        : undefined;
  }

  otherEnd(nodeId: number): number | undefined {
    return this.connectedNodes.n1 === nodeId
      ? this.connectedNodes.n2
      : this.connectedNodes.n2 === nodeId
        ? this.connectedNodes.n1
        : undefined;
  }

  // Method to draw the line
  public drawEdge(startPos: Point, endPos: Point, color: number) {
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
    // TODO
    console.log("deselected");
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
    const info = new StyledInfo("Edge Information");
    info.addField("Edge ID", this.id.toString());
    info.addField(
      "Connected Devices",
      `${this.connectedNodes.n1} <=> ${this.connectedNodes.n2}`,
    );
    info.addField(
      "Start Position",
      `x=${this.startPos.x.toFixed(2)}, y=${this.startPos.y.toFixed(2)}`,
    );
    info.addField(
      "End Position",
      `x=${this.endPos.x.toFixed(2)}, y=${this.endPos.y.toFixed(2)}`,
    );

    // Calls renderInfo to display Edge information
    this.rightbar.renderInfo(info);

    // Adds the delete button using addButton
    this.rightbar.addButton(
      "Delete Edge",
      () => this.delete(),
      "right-bar-delete-button",
    );
  }

  // Method to delete the edge
  delete() {
    // Remove the edge from the viewgraph and datagraph
    deselectElement();
    this.viewgraph.removeEdge(this.id);

    console.log(`Edge with ID ${this.id} deleted.`);
  }

  public updatePosition(device1: Device, device2: Device) {
    const dx = device2.x - device1.x;
    const dy = device2.y - device1.y;
    const angle = Math.atan2(dy, dx);

    const offsetX1 = ((device1.width + 5) / 2) * Math.cos(angle);
    const offsetY1 = ((device1.height + 5) / 2) * Math.sin(angle);
    const offsetX2 = ((device2.width + 5) / 2) * Math.cos(angle);
    const offsetY2 = ((device2.height + 5) / 2) * Math.sin(angle);

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

  public remove() {
    const { n1, n2 } = this.connectedNodes;
    const device1 = this.viewgraph.getDevice(n1);
    const device2 = this.viewgraph.getDevice(n2);

    // Remove the connection from each connected device
    if (device1) device1.connections.delete(this.id);
    if (device2) device2.connections.delete(this.id);

    // Remove the edge from the viewport
    this.viewgraph.getViewport().removeChild(this);
    this.destroy();

    console.log(
      `Edge with ID ${this.id} removed between devices ${n1} and ${n2}.`,
    );
  }
}
