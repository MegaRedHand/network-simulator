import { Graphics } from "pixi.js";
import { ViewGraph } from "./graphs/viewgraph";
import { Device } from "./device";
import { deselectElement, selectElement } from "./viewportManager";
import { RightBar } from "..";

export enum Colors {
  Violet = 0x4b0082, // Violeta
  Burgundy = 0x6d071a, // Bordo
}

export class Edge extends Graphics {
  id: number;
  connectedNodes: { n1: number; n2: number };
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  viewgraph: ViewGraph;
  rightbar: RightBar;

  constructor(
    id: number,
    connectedNodes: { n1: number; n2: number },
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

  // Method to draw the line
  public drawEdge(
    startPos: { x: number; y: number },
    endPos: { x: number; y: number },
    color: number,
  ) {
    this.clear();
    this.moveTo(startPos.x, startPos.y);
    this.lineTo(endPos.x, endPos.y);
    this.stroke({ width: 3, color });
    this.startPos = startPos;
    this.endPos = endPos;
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
    this.drawEdge(this.startPos, this.endPos, Colors.Burgundy);
  }

  // Method to show the Edge information
  showInfo() {
    // Calls renderInfo to display Edge information
    this.rightbar.renderInfo("Edge Information", [
      { label: "Edge ID", value: this.id.toString() },
      {
        label: "Connected Devices",
        value: `${this.connectedNodes.n1} <=> ${this.connectedNodes.n2}`,
      },
      {
        label: "Start Position",
        value: `x=${this.startPos.x.toFixed(2)}, y=${this.startPos.y.toFixed(2)}`,
      },
      {
        label: "End Position",
        value: `x=${this.endPos.x.toFixed(2)}, y=${this.endPos.y.toFixed(2)}`,
      },
    ]);

    // Adds the delete button using addButton
    this.rightbar.addButton("Delete Edge", () => this.deleteEdge());
  }

  // Method to delete the edge
  deleteEdge() {
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

    const newStartPos = { x: device1.x + offsetX1, y: device1.y + offsetY1 };
    const newEndPos = { x: device2.x - offsetX2, y: device2.y - offsetY2 };

    this.drawEdge(newStartPos, newEndPos, 0x6d071a);
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
