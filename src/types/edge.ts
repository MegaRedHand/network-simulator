import { Graphics } from "pixi.js";
import { DataGraph } from "./graphs/datagraph";
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

    // Dibuja la línea y la hace interactiva
    this.drawEdge(this.startPos, this.endPos);
    this.eventMode = "static";
    this.interactive = true;
    this.on("click", this.showInfo);
  }

  // Método para dibujar la línea
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

  // Método para mostrar la información de la arista y el botón de eliminar
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
        <p><strong>Connected Devices:</strong> ${this.connectedNodes.n1} <-> ${this.connectedNodes.n2}</p>
        <p><strong>Start Position:</strong> x=${startX}, y=${startY}</p>
        <p><strong>End Position:</strong> x=${endX}, y=${endY}</p>
        <button id="delete-edge">Eliminar Edge</button>
      `;

      // Añadir el evento al botón de eliminar
      const deleteButton = document.getElementById("delete-edge");
      deleteButton?.addEventListener("click", () => this.deleteEdge());
    }
  }

  // Método para eliminar la arista
  deleteEdge() {
    // Elimina la arista del viewgraph y del datagraph
    this.viewgraph.removeEdge(this.id);

    // Muestra un mensaje de confirmación en la right-bar
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      rightBar.innerHTML = "<p>Edge eliminado.</p>";
    }

    console.log(`Edge con ID ${this.id} eliminado.`);
  }
}
