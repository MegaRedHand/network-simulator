import { Graphics } from "pixi.js";
import { ViewGraph } from "./graphs/viewgraph";

export class Edge extends Graphics {
  id: number;
  connectedNodes: { n1: number; n2: number };
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  viewgraph: ViewGraph;

  constructor(
    id: number,
    connectedNodes: { n1: number; n2: number },
    startPos: { x: number; y: number },
    endPos: { x: number; y: number },
    viewgraph: ViewGraph,
  ) {
    super();

    this.id = id;
    this.connectedNodes = connectedNodes;
    this.startPos = startPos;
    this.endPos = endPos;
    this.viewgraph = viewgraph;

    // Draw the line and make it interactive
    this.drawEdge(this.startPos, this.endPos);
    this.eventMode = "static";
    this.interactive = true;
    this.on("click", this.showInfo);
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
