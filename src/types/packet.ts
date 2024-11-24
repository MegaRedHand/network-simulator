import {
  FederatedPointerEvent,
  Graphics,
  GraphicsContext,
  Ticker,
} from "pixi.js";
import { Edge } from "./edge";
import { deselectElement, isSelected, selectElement } from "./viewportManager";
import { circleGraphicsContext, Colors, ZIndexLevels } from "../utils";
import { RightBar, StyledInfo } from "../graphics/right_bar";
import { Position } from "./common";
import { ViewGraph } from "./graphs/viewgraph";
import { EmptyPayload, IPv4Packet } from "../packets/ip";
import { EchoRequest } from "../packets/icmp";

const contextPerPacketType: Record<string, GraphicsContext> = {
  IP: circleGraphicsContext(Colors.Green, 0, 0, 5),
  ICMP: circleGraphicsContext(Colors.Red, 0, 0, 5),
};

const highlightedPacketContext = circleGraphicsContext(Colors.Violet, 0, 0, 6);

export class Packet extends Graphics {
  speed: number = 200;
  progress = 0;
  currentPath: Edge[];
  currentEdge: Edge;
  currentStart: number;
  color: number;
  type: string;
  sourceId: number;
  destinationId: number;

  rawPacket: IPv4Packet;

  static animationPaused = false;

  static pauseAnimation() {
    Packet.animationPaused = true;
  }

  static unpauseAnimation() {
    Packet.animationPaused = false;
  }

  constructor(
    type: string,
    rawPacket: IPv4Packet,
    sourceid: number,
    destinationid: number,
  ) {
    super();

    this.type = type;

    this.context = contextPerPacketType[this.type];
    this.zIndex = ZIndexLevels.Packet;

    this.rawPacket = rawPacket;
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
    const info = new StyledInfo("Packet Information");
    info.addField("Type", this.type);
    info.addField("Source ID", this.sourceId.toString());
    info.addField("Destination ID", this.destinationId.toString());
    info.addField("Source IP Address", this.rawPacket.sourceAddress.toString());
    info.addField(
      "Destination IP Address",
      this.rawPacket.destinationAddress.toString(),
    );

    rightbar.renderInfo(info);
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
        if (isSelected(this)) {
          deselectElement();
        }
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

export function sendPacket(
  viewgraph: ViewGraph,
  packetType: string,
  originId: number,
  destinationId: number,
) {
  console.log(
    `Sending ${packetType} packet from ${originId} to ${destinationId}`,
  );

  const pathEdgeIds = viewgraph.getPathBetween(originId, destinationId);

  if (pathEdgeIds.length === 0) {
    console.warn(
      `No se encontró un camino entre ${originId} y ${destinationId}.`,
    );
    return;
  }

  const originDevice = viewgraph.getDevice(originId);
  const destinationDevice = viewgraph.getDevice(destinationId);

  const pathEdges = pathEdgeIds.map((id) => viewgraph.getEdge(id));

  // TODO: allow user to choose which payload to send
  let payload;
  switch (packetType) {
    case "IP":
      payload = new EmptyPayload();
      break;
    case "ICMP":
      payload = new EchoRequest(0);
      break;
    default:
      console.warn("Tipo de paquete no reconocido");
      return;
  }
  const rawPacket = new IPv4Packet(
    originDevice.ip,
    destinationDevice.ip,
    payload,
  );
  const packet = new Packet(packetType, rawPacket, originId, destinationId);
  packet.animateAlongPath(pathEdges, originId);
}
