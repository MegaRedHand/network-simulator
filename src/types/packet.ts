import {
  FederatedPointerEvent,
  Graphics,
  GraphicsContext,
  Ticker,
} from "pixi.js";
import { Edge, Position } from "./edge";
import { selectElement } from "./viewportManager";
import { circleGraphicsContext, Colors, ZIndexLevels } from "../utils";
import { RightBar } from "../index";

const contextPerPacketType: Record<string, GraphicsContext> = {
  IP: circleGraphicsContext(Colors.Green, 0, 0, 5),
  ICMP: circleGraphicsContext(Colors.Red, 0, 0, 5),
};

const highlightedPacketContext = circleGraphicsContext(Colors.Violet, 0, 0, 6);

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

  static animationPaused = false;

  static pauseAnimation() {
    Packet.animationPaused = true;
  }

  static unpauseAnimation() {
    Packet.animationPaused = false;
  }

  constructor(
    type: string,
    speed: number,
    sourceid: number,
    destinationid: number,
  ) {
    super();

    this.type = type;

    this.context = contextPerPacketType[this.type];
    this.zIndex = ZIndexLevels.Packet;

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
    this.context = highlightedPacketContext;
  }

  removeHighlight() {
    this.context = contextPerPacketType[this.type];
  }

  animateAlongPath(path: Edge[], start: number): void {
    if (path.length === 0) {
      console.error(
        "No se puede animar un paquete a lo largo de un camino vacío",
      );
      this.destroy();
      return;
    }
    console.log(path);
    this.currentPath = path;
    this.currentEdge = this.currentPath.shift();
    this.currentStart = start;
    // Add packet as a child of the current edge
    this.currentEdge.addChild(this);
    this.updatePosition();
    Ticker.shared.add(this.animationTick, this);
  }

  animationTick(ticker: Ticker) {
    if (this.progress >= 1) {
      this.progress = 0;
      this.removeFromParent();
      if (this.currentPath.length == 0) {
        ticker.remove(this.animationTick, this);
        this.destroy();
        return;
      }
      this.currentStart = this.currentEdge.otherEnd(this.currentStart);
      this.currentEdge = this.currentPath.shift();
      this.currentEdge.addChild(this);
    }
    if (!Packet.animationPaused) {
      this.progress += (ticker.deltaMS * this.speed) / 100000;
    }

    this.updatePosition();
  }

  updatePosition() {
    const current = this.currentEdge;
    const start = this.currentStart;

    const startPos = current.nodePosition(start);
    const endPos = current.nodePosition(current.otherEnd(start));
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
