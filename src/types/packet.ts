import {
  FederatedPointerEvent,
  Graphics,
  GraphicsContext,
  Ticker,
} from "pixi.js";
import { deselectElement, isSelected, selectElement } from "./viewportManager";
import { circleGraphicsContext, Colors, ZIndexLevels } from "../utils";
import { RightBar, StyledInfo } from "../graphics/right_bar";
import { Position } from "./common";
import { ViewGraph } from "./graphs/viewgraph";
import { Layer } from "./layer";
//import { EchoMessage } from "../packets/icmp";
import { DataGraph, DeviceId } from "./graphs/datagraph";
import { EthernetFrame, IP_PROTOCOL_TYPE } from "../packets/ethernet";
import { ICMP_PROTOCOL_NUMBER, IPv4Packet } from "../packets/ip";
import { GlobalContext } from "../context";
import { DataRouter, DataSwitch } from "./data-devices";
import {
  ICMP_REPLY_TYPE_NUMBER,
  ICMP_REQUEST_TYPE_NUMBER,
  IcmpPacket,
} from "../packets/icmp";

const contextPerPacketType: Record<string, GraphicsContext> = {
  IP: circleGraphicsContext(Colors.Green, 0, 0, 5),
  "ICMP-8": circleGraphicsContext(Colors.Red, 0, 0, 5),
  "ICMP-0": circleGraphicsContext(Colors.Yellow, 0, 0, 5),
  EMPTY: circleGraphicsContext(Colors.Grey, 0, 0, 5),
};

const highlightedPacketContext = circleGraphicsContext(Colors.Violet, 0, 0, 6);

export interface PacketLocation {
  startId: DeviceId;
  endId: DeviceId;
  currProgress: number;
}

interface PacketContext {
  type: string;
  layer: Layer;
}

function packetIsVisible(
  _: ViewGraph | DataGraph,
  isVisible: boolean,
): _ is ViewGraph {
  return isVisible;
}

function packetContext(frame: EthernetFrame): PacketContext {
  if (frame.payload.type() === IP_PROTOCOL_TYPE) {
    const datagram = frame.payload as IPv4Packet;
    if (datagram.payload.protocol() === ICMP_PROTOCOL_NUMBER) {
      const packet = datagram.payload as IcmpPacket;
      if (packet.type === ICMP_REQUEST_TYPE_NUMBER) {
        return { type: "ICMP-8", layer: Layer.Network };
      }
      if (packet.type === ICMP_REPLY_TYPE_NUMBER) {
        return { type: "ICMP-0", layer: Layer.Network };
      }
    }
  }
  return { type: "EMPTY", layer: Layer.Link };
}

export class Packet extends Graphics {
  packetId: string;
  protected speed = 100;
  protected progress = 0;
  protected currStart: DeviceId;
  protected currEnd: DeviceId;
  protected graph: ViewGraph | DataGraph;
  protected type: string;
  protected rawPacket: EthernetFrame;
  ctx: GlobalContext;
  belongingLayer: Layer;

  static animationPaused = false;

  static pauseAnimation() {
    Packet.animationPaused = true;
  }

  static resumeAnimation() {
    Packet.animationPaused = false;
  }

  constructor(
    graph: ViewGraph | DataGraph,
    rawPacket: EthernetFrame,
    ctx: GlobalContext,
    isVisible: boolean,
  ) {
    super();
    this.packetId = crypto.randomUUID();
    this.graph = graph;
    const { type, layer } = packetContext(rawPacket);
    this.belongingLayer = layer;
    this.type = type;
    this.context = contextPerPacketType[this.type];
    this.zIndex = ZIndexLevels.Packet;

    this.rawPacket = rawPacket;
    this.ctx = ctx;
    this.interactive = true;
    this.cursor = "pointer";
    this.on("click", this.onClick, this);
    this.on("tap", this.onClick, this);
    // register in Packet Manger
    ctx.getViewGraph().getPacketManager().registerPacket(this);
    this.visible = isVisible;
  }

  setProgress(progress: number) {
    this.progress = progress;
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

  private getPacketDetails(layer: Layer, rawPacket: EthernetFrame) {
    return rawPacket.getDetails(layer);
  }

  getPacketLocation(): PacketLocation {
    return {
      startId: this.currStart,
      endId: this.currEnd,
      currProgress: this.progress,
    };
  }

  showInfo() {
    const rightbar = RightBar.getInstance();
    if (!rightbar) {
      console.error("RightBar instance not found.");
      return;
    }

    const info = new StyledInfo("Packet Information");
    info.addField("Type", this.type);
    info.addField("Source MAC Address", this.rawPacket.source.toString());
    info.addField(
      "Destination MAC Address",
      this.rawPacket.destination.toString(),
    );

    rightbar.renderInfo(info);

    // Add a delete packet button with the delete button style
    rightbar.addButton(
      "Delete Packet",
      () => {
        this.delete();
      },
      "right-bar-delete-button",
    );

    // Add a toggle info section for packet details
    const packetDetails = this.getPacketDetails(
      this.belongingLayer,
      this.rawPacket,
    );

    rightbar.addToggleButton("Packet Details", packetDetails);
  }

  highlight() {
    this.context = highlightedPacketContext;
  }

  removeHighlight() {
    if (!this.context || !contextPerPacketType[this.type]) {
      console.warn("Context or packet type context is null");
      return;
    }
    this.context = contextPerPacketType[this.type];
  }

  getCurrStart(): DeviceId {
    return this.currStart;
  }

  getCurrEnd(): DeviceId {
    return this.currEnd;
  }

  getProgress(): number {
    return this.progress;
  }

  getRawPacket(): EthernetFrame {
    return this.rawPacket;
  }

  getType(): string {
    return this.type;
  }

  setCurrStart(id: DeviceId) {
    this.currStart = id;
  }

  deliverPacket() {
    const newStartDevice = this.graph.getDevice(this.currEnd);

    // Viewgraph may return undefined when trying to get the device
    // as the device may have been removed by the user.
    if (!newStartDevice) {
      return;
    }
    newStartDevice.receiveFrame(this.rawPacket);
  }

  traverseEdge(startId: DeviceId, endId: DeviceId): void {
    this.currStart = startId;
    this.currEnd = endId;

    // if the packet is shown in viewgraph
    if (packetIsVisible(this.graph, this.visible)) {
      const currEdge = this.graph.getEdge(startId, endId);
      currEdge.addChild(this);
      const start = currEdge.nodePosition(this.currStart);
      const end = currEdge.nodePosition(this.currEnd);
      this.updatePosition(start, end);
    } else {
      this.updatePosition();
    }
    Ticker.shared.add(this.animationTick, this);
  }

  animationTick(ticker: Ticker) {
    let start: Position;
    let end: Position;
    if (packetIsVisible(this.graph, this.visible)) {
      const currEdge = this.graph.getEdge(this.currStart, this.currEnd);
      if (!currEdge) {
        console.warn(
          `No edge connecting devices ${this.currStart} and ${this.currEnd} in viewgraph`,
        );
        this.delete();
        return;
      }
      start = currEdge.nodePosition(this.currStart);
      end = currEdge.nodePosition(this.currEnd);
    } else {
      const currStartDevice = this.graph.getDevice(this.currStart);
      const currEndDevice = this.graph.getDevice(this.currEnd);
      if (!currStartDevice) {
        console.warn("Current start device not found.");
        this.delete();
        return;
      }
      if (!currEndDevice) {
        console.warn("Current end device not found.");
        this.delete();
        return;
      }
      start = currStartDevice.getPosition();
      end = currEndDevice.getPosition();
    }

    const edgeLength = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2),
    );

    const normalizedSpeed = this.speed / edgeLength;

    if (!Packet.animationPaused) {
      const progressIncrement =
        (ticker.deltaMS * normalizedSpeed * this.ctx.getCurrentSpeed().value) /
        1000;
      this.progress += progressIncrement;
      this.updatePosition(start, end);
    }

    if (this.progress >= 1) {
      // Deliver packet
      this.deliverPacket();
      // Clean up
      this.delete();
    }
  }

  updatePosition(start?: Position, end?: Position) {
    if (start && end) {
      this.setPositionAlongEdge(start, end);
    } else {
      this.setPositionAlongEdge(
        this.graph.getDevice(this.currStart).getPosition(),
        this.graph.getDevice(this.currEnd).getPosition(),
      );
    }
  }

  /// Updates the position according to the current progress.
  private setPositionAlongEdge(start: Position, end: Position) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    this.x = start.x + this.progress * dx;
    this.y = start.y + this.progress * dy;
  }

  delete() {
    // Remove packet from Ticker to stop animation
    Ticker.shared.remove(this.animationTick, this);

    this.removeAllListeners();

    // Remove packet from the edge
    this.removeFromParent();

    if (isSelected(this)) {
      deselectElement();
    }

    // Deregister packet from PacketManager
    this.ctx.getViewGraph().getPacketManager().deregisterPacket(this.packetId);
    this.destroy();
  }
}

export function sendViewPacket(
  viewgraph: ViewGraph,
  srcId: DeviceId,
  rawPacket: EthernetFrame,
) {
  const srcMac = rawPacket.source;
  const dstMac = rawPacket.destination;
  console.log(
    `Sending frame from ${srcMac.toString()} to ${dstMac.toString()}`,
  );
  const originConnections = viewgraph.getConnections(srcId);
  if (originConnections.length === 0) {
    console.warn("El dispositivo de origen no tiene conexiones.");
    return;
  }
  let firstEdge = originConnections.find((edge) => {
    const otherId = edge.otherEnd(srcId);
    const otherDevice = viewgraph.getDevice(otherId);
    return otherDevice.mac.equals(dstMac);
  });
  if (firstEdge === undefined) {
    const datagraph = viewgraph.getDataGraph();
    firstEdge = originConnections.find((edge) => {
      const otherId = edge.otherEnd(srcId);
      const otherDevice = datagraph.getDevice(otherId);
      return (
        otherDevice instanceof DataRouter || otherDevice instanceof DataSwitch
      );
    });
  }
  if (firstEdge === undefined) {
    console.warn(
      "El dispositivo de origen no está conectado al destino, a un router o a un switch.",
    );
    return;
  }
  const packet = new Packet(viewgraph, rawPacket, viewgraph.ctx, true);
  packet.traverseEdge(srcId, firstEdge.otherEnd(srcId));
}

export function sendDataPacket(
  datagraph: DataGraph,
  srcId: DeviceId,
  rawPacket: EthernetFrame,
) {
  const srcMac = rawPacket.source;
  const dstMac = rawPacket.destination;
  console.log(
    `Sending frame from ${srcMac.toString()} to ${dstMac.toString()}`,
  );
  const originConnections = datagraph.getConnections(srcId);
  if (originConnections.length === 0) {
    console.warn("El dispositivo de origen no tiene conexiones.");
    return;
  }
  let firstHop = originConnections.find((otherId) => {
    const otherDevice = datagraph.getDevice(otherId);
    return otherDevice.mac.equals(dstMac);
  });
  if (firstHop === undefined) {
    firstHop = originConnections.find((otherId) => {
      const otherDevice = datagraph.getDevice(otherId);
      return (
        otherDevice instanceof DataRouter || otherDevice instanceof DataSwitch
      );
    });
  }
  if (firstHop === undefined) {
    console.warn(
      "El dispositivo de origen no está conectado al destino, a un router o a un switch.",
    );
    return;
  }
  const packet = new Packet(datagraph, rawPacket, datagraph.ctx, false);
  packet.traverseEdge(srcId, firstHop);
}
