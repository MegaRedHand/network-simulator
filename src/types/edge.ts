import { Graphics } from "pixi.js";
import { ViewGraph } from "./graphs/viewgraph";
import { Device } from "./device";
import { selectElement } from "./viewportManager";

export class Edge extends Graphics {
  id: number;
  connectedNodes: { n1: number; n2: number };
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  viewgraph: ViewGraph;

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
    this.on("click", () => selectElement(this));
  }

  // Method to draw the line
  public drawEdge(
    startPos: { x: number; y: number },
    endPos: { x: number; y: number },
  ) {
    this.clear();
    this.moveTo(startPos.x, startPos.y);
    this.lineTo(endPos.x, endPos.y);
    this.stroke({ width: 3, color: 0xff0000 });
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

  // Method to display the edge information and the delete button
  showInfo() {
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      const startX = this.startPos.x.toFixed(2);
      const startY = this.startPos.y.toFixed(2);
      const endX = this.endPos.x.toFixed(2);
      const endY = this.endPos.y.toFixed(2);

      rightBar.innerHTML = `
        <h3>Edge Information</h3>
        <p><strong>Edge ID:</strong> ${this.id}</p>
        <p><strong>Connected Devices:</strong> ${this.connectedNodes.n1} <=> ${this.connectedNodes.n2}</p>
        <p><strong>Start Position:</strong> x=${startX}, y=${startY}</p>
        <p><strong>End Position:</strong> x=${endX}, y=${endY}</p>
        <button id="delete-edge">Delete Edge</button>
      `;

      // Add event to the delete button
      const deleteButton = document.getElementById("delete-edge");
      deleteButton?.addEventListener("click", () => this.deleteEdge());
    }
  }

  // Method to delete the edge
  deleteEdge() {
    // Remove the edge from the viewgraph and datagraph
    this.viewgraph.removeEdge(this.id);

    // Display a confirmation message in the right-bar
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      rightBar.innerHTML = "<p>Edge deleted.</p>";
    }

    console.log(`Edge with ID ${this.id} deleted.`);
  }
}
