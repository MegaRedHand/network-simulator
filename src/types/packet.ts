import { FederatedPointerEvent, Graphics, Ticker } from "pixi.js";
import { Edge, Position } from "./edge";
import { selectElement } from "./viewportManager";
import { Colors, drawCircle } from "../utils";
import { RightBar } from "../index";

export const packetTicker = new Ticker();

export class Packet extends Graphics {
  speed: number;
  progress = 0;
  currentPath: Edge[];
  currentEdge: Edge;
  currentStart: number;
  color: number;
  type: string;
  sourceId: number;
  destinationId: number;

  constructor(
    type: string,
    speed: number,
    sourceid: number,
    destinationid: number,
  ) {
    super();

    this.type = type;

    const packetColors: Record<string, number> = {
      IP: Colors.Green, // Verde para paquetes IP
      ICMP: Colors.Red, // Rojo para paquetes ICMP
    };

    this.color = packetColors[this.type] || Colors.White; // Color por defecto blanco

    drawCircle(this, this.color, 0, 0, 5);
    this.speed = speed;
    this.sourceId = sourceid;
    this.destinationId = destinationid;

    this.interactive = true;
    this.cursor = "pointer";
    this.on("click", this.onClick, this);
  }

  onClick(e: FederatedPointerEvent) {
    e.stopPropagation();
    selectElement(this);
  }

  select() {
    this.highlight(); // Calls highlight on select
    this.showInfo();
  }

  deselect() {
    this.removeHighlight(); // Calls removeHighlight on deselect
  }

  showInfo() {
    const rightbar = RightBar.getInstance();
    const info = [
      { label: "Type", value: this.type },
      { label: "Source ID", value: this.sourceId.toString() },
      { label: "Destination ID", value: this.destinationId.toString() },
    ];

    rightbar.renderInfo("Packet Information", info);
  }

  highlight() {
    drawCircle(this, Colors.Violet, 0, 0, 5);
  }

  removeHighlight() {
    drawCircle(this, this.color, 0, 0, 5);
  }

  animateAlongPath(path: Edge[], start: number): void {
    if (path.length === 0) {
      console.error(
        "No se puede animar un paquete a lo largo de un camino vacío",
      );
      return;
    }
    console.log(path);
    this.currentPath = path;
    this.currentEdge = this.currentPath.shift();
    this.currentStart = start;
    // TODO: use global ticker, and add "shouldProgress" flag
    packetTicker.add(this.updateProgress, this);
  }

  updateProgress(ticker: Ticker) {
    if (this.progress >= 1) {
      this.progress = 0;
      if (this.currentPath.length == 0) {
        ticker.remove(this.updateProgress, this);
        this.removeFromParent();
        return;
      }
      this.currentStart = this.currentEdge.otherEnd(this.currentStart);
      this.currentEdge = this.currentPath.shift();
    }
    this.progress += (ticker.deltaMS * this.speed) / 100000;

    const current = this.currentEdge;
    const start = this.currentStart;

    console.log("current: ", current);
    console.log("start: ", start);

    const startPos = current.nodePosition(start);
    console.log("startPos: ", startPos);
    const endPos = current.nodePosition(current.otherEnd(start));
    console.log("endPos: ", endPos);
    this.setPositionAlongEdge(startPos, endPos, this.progress);
  }

  /// Updates the position according to the current progress.
  setPositionAlongEdge(start: Position, end: Position, progress: number) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Mover el paquete
    this.x = start.x + progress * dx;
    this.y = start.y + progress * dy;
  }

  delete() {
    // TODO: Implement delete functionality
  }
}