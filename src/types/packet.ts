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
import { EmptyPayload, IpAddress, IPv4Packet } from "../packets/ip";
import { EchoRequest } from "../packets/icmp";
import { DeviceId, isRouter } from "./graphs/datagraph";

const contextPerPacketType: Record<string, GraphicsContext> = {
  IP: circleGraphicsContext(Colors.Green, 0, 0, 5),
  ICMP: circleGraphicsContext(Colors.Red, 0, 0, 5),
};

const highlightedPacketContext = circleGraphicsContext(Colors.Violet, 0, 0, 6);

export class Packet extends Graphics {
  speed = 200;
  progress = 0;
  viewgraph: ViewGraph;
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
    viewgraph: ViewGraph,
    type: string,
    rawPacket: IPv4Packet,
    sourceid: number,
    destinationid: number,
  ) {
    super();

    this.viewgraph = viewgraph;
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
    this.highlight();
    this.showInfo();
  }

  deselect() {
    this.removeHighlight();
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

  traverseEdge(edge: Edge, start: DeviceId): void {
    this.progress = 0;
    this.currentEdge = edge;
    this.currentStart = start;
    // Add packet as a child of the current edge
    this.currentEdge.addChild(this);
    this.updatePosition();
    Ticker.shared.add(this.animationTick, this);
  }

  routePacket(id: DeviceId): DeviceId | null {
    const device = this.viewgraph.datagraph.getDevice(id);
    if (isRouter(device)) {
      const result = device.routingTable.find((entry) => {
        const ip = IpAddress.parse(entry.ip);
        const mask = IpAddress.parse(entry.mask);
        console.log("considering entry:", entry);
        return this.rawPacket.destinationAddress.isInSubnet(ip, mask);
      });
      console.log("result:", result);
      return result === undefined ? null : result.iface;
    }
    return null;
  }

  animationTick(ticker: Ticker) {
    if (this.progress >= 1) {
      this.progress = 0;
      this.removeFromParent();
      const newStart = this.currentEdge.otherEnd(this.currentStart);
      this.currentStart = newStart;
      const newEdgeId = this.routePacket(newStart);

      const deleteSelf = () => {
        this.destroy();
        ticker.remove(this.animationTick, this);
        if (isSelected(this)) {
          deselectElement();
        }
      };

      if (newEdgeId === null) {
        deleteSelf();
        return;
      }
      const currentNodeEdges = this.viewgraph.getConnections(newStart);
      this.currentEdge = currentNodeEdges.find((edge) => {
        return edge.otherEnd(newStart) === newEdgeId;
      });
      if (this.currentEdge === undefined) {
        deleteSelf();
        return;
      }
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
  originId: DeviceId,
  destinationId: DeviceId,
) {
  console.log(
    `Sending ${packetType} packet from ${originId} to ${destinationId}`,
  );

  const originDevice = viewgraph.getDevice(originId);
  const destinationDevice = viewgraph.getDevice(destinationId);

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
  const packet = new Packet(
    viewgraph,
    packetType,
    rawPacket,
    originId,
    destinationId,
  );
  const originConnections = viewgraph.getConnections(originId);
  if (originConnections.length === 0) {
    console.warn(`No se encontró un dispositivo con ID ${originId}.`);
    return;
  }
  let firstEdge = originConnections.find((edge) => {
    return edge.otherEnd(originId) === destinationId;
  });
  if (firstEdge === undefined) {
    firstEdge = originConnections[0];
  }
  packet.traverseEdge(firstEdge, originId);
}
