import { FederatedPointerEvent, Graphics } from "pixi.js";
import { ViewGraph } from "./graphs/viewgraph";
import { Device } from "./device";
import { deselectElement, selectElement } from "./viewportManager";
import { RightBar } from "..";

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
    this.rightbar = RightBar.getFrom(document);

    // Calculate the angle and offsets between the devices
    const dx = device2.x - device1.x;
    const dy = device2.y - device1.y;
    const angle = Math.atan2(dy, dx);

    const offsetX1 = (device1.width / 2) * Math.cos(angle);
    const offsetY1 = (device1.height / 2) * Math.sin(angle);
    const offsetX2 = (device2.width / 2) * Math.cos(angle);
    const offsetY2 = (device2.height / 2) * Math.sin(angle);

    // Define start and end positions based on offsets
    this.startPos = {
      x: device1.x + offsetX1,
      y: device1.y + offsetY1,
    };
    this.endPos = {
      x: device2.x - offsetX2,
      y: device2.y - offsetY2,
    };

    // Draw the line and make it interactive
    this.drawEdge(this.startPos, this.endPos);
    this.eventMode = "static";
    this.interactive = true;
    this.cursor = "pointer";
    this.on("click", (event: FederatedPointerEvent) => selectElement(this));
  }

  // Method to draw the line
  public drawEdge(
    startPos: { x: number; y: number },
    endPos: { x: number; y: number },
  ) {
    this.clear();
    this.moveTo(startPos.x, startPos.y);
    this.lineTo(endPos.x, endPos.y);
    this.stroke({ width: 3, color: 0x8FD19E });
    this.startPos = startPos;
    this.endPos = endPos;
  }

  select() {
    this.showInfo();
  }

  deselect() {
    // TODO
    console.log("deseleccione");
  }

  // Método para mostrar la información del Edge
  showInfo() {
    // Llama a renderInfo para mostrar la información del Edge
    this.rightbar.renderInfo("Edge Information", [
      { label: "Edge ID", value: this.id.toString() },
      { label: "Connected Devices", value: `${this.connectedNodes.n1} <=> ${this.connectedNodes.n2}` },
      { label: "Start Position", value: `x=${this.startPos.x.toFixed(2)}, y=${this.startPos.y.toFixed(2)}` },
      { label: "End Position", value: `x=${this.endPos.x.toFixed(2)}, y=${this.endPos.y.toFixed(2)}` }
    ]);

    // Añade el botón de eliminación utilizando addButton
    this.rightbar.addButton("Delete Edge", () => this.deleteEdge());
  }

  // Method to delete the edge
  deleteEdge() {
    // Remove the edge from the viewgraph and datagraph
    this.viewgraph.removeEdge(this.id);
    deselectElement();

    console.log(`Edge with ID ${this.id} deleted.`);
  }
}
