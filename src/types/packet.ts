import { Graphics, Ticker } from "pixi.js";
import { Edge, Position } from "./edge";

export class Packet extends Graphics {
  speed: number;
  progress = 0;
  currentPath: Edge[];
  currentEdge: Edge;
  currentStart: number;

  constructor(color: number, speed: number) {
    super();
    this.beginFill(color);
    this.drawCircle(0, 0, 5); // Cambiar a un círculo con radio de 5
    this.endFill();
    this.speed = speed;
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
    Ticker.shared.add(this.updateProgress, this);
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

    let startPos = current.nodePosition(start);
    console.log("startPos: ", startPos);
    let endPos = current.nodePosition(current.otherEnd(start));
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
}
