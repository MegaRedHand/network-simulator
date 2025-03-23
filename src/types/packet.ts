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
import { Layer } from "./layer";
//import { EchoMessage } from "../packets/icmp";
import { DataGraph, DeviceId } from "./graphs/datagraph";
import { EthernetFrame } from "../packets/ethernet";
import { IPv4Packet } from "../packets/ip";
import { GlobalContext } from "../context";
import { DataRouter, DataSwitch } from "./data-devices";

const contextPerPacketType: Record<string, GraphicsContext> = {
  IP: circleGraphicsContext(Colors.Green, 0, 0, 5),
  "ICMP-8": circleGraphicsContext(Colors.Red, 0, 0, 5),
  "ICMP-0": circleGraphicsContext(Colors.Yellow, 0, 0, 5),
};

const highlightedPacketContext = circleGraphicsContext(Colors.Violet, 0, 0, 6);

export interface PacketLocation {
  prevDevice: DeviceId;
  nextDevice: DeviceId;
  currProgress: number;
}

export abstract class Packet extends Graphics {
  packetId: string;
  speed = 100;
  progress = 0;
  currentStart: number;
  color: number;
  type: string;
  rawPacket: EthernetFrame;
  srcId: DeviceId;
  dstId: DeviceId;
  belongingLayer: Layer;
  ctx: GlobalContext;

  static animationPaused = false;

  static pauseAnimation() {
    Packet.animationPaused = true;
  }

  static resumeAnimation() {
    Packet.animationPaused = false;
  }

  constructor(
    belongingLayer: Layer,
    type: string,
    srcId: DeviceId,
    dstId: DeviceId,
    rawPacket: EthernetFrame,
    ctx: GlobalContext,
  ) {
    super();
    this.packetId = crypto.randomUUID();
    this.belongingLayer = belongingLayer;
    this.type = type;
    this.context = contextPerPacketType[this.type];
    this.zIndex = ZIndexLevels.Packet;
    this.srcId = srcId;
    this.dstId = dstId;
    this.rawPacket = rawPacket;
    this.ctx = ctx;
    this.interactive = true;
    this.cursor = "pointer";
    this.on("click", this.onClick, this);
    this.on("tap", this.onClick, this);
    // register in Packet Manger
    ctx.getViewGraph().getPacketManager().registerPacket(this);
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

  abstract getPacketLocation(): PacketLocation;

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

  setCurrStart(id: DeviceId) {
    this.currentStart = id;
  }

  // reloadLocation(newPrevDevice: number, newNextDevice: number) {
  //   this.currentStart = newPrevDevice;
  //   const currEdge = this.graph.getEdge(newPrevDevice, newNextDevice);
  //   if (!currEdge) {
  //     // hacer algo
  //     console.debug("CurrEdge no existe!");
  //     this.delete();
  //     return;
  //   }
  //   const nextDevice = this.graph.getVertex(newNextDevice);
  //   if (
  //     nextDevice.getType() == DeviceType.DataRouter ||
  //     nextDevice.getType() == DeviceType.Host
  //   ) {
  //     console.debug("Entro aca wacho");
  //     this.rawPacket.destination = nextDevice.mac;
  //   }
  //   this.currentEdge = currEdge;
  //   currEdge.registerPacket(this);
  //   Ticker.shared.add(this.animationTick, this);
  // }

  updatePosition(edge: Edge) {
    const startPos = edge.nodePosition(this.currentStart);
    const endPos = edge.nodePosition(edge.otherEnd(this.currentStart));
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
    this.removeAllListeners();
    this.removeFromParent();

    if (isSelected(this)) {
      deselectElement();
    }

    this.ctx.getViewGraph().getPacketManager().deregisterPacket(this.packetId);
    this.destroy();
  }
}

export class ViewPacket extends Packet {
  viewgraph: ViewGraph;
  currentEdge: Edge;

  constructor(
    viewgraph: ViewGraph,
    belongingLayer: Layer,
    type: string,
    srcId: DeviceId,
    dstId: DeviceId,
    rawPacket: EthernetFrame,
    ctx: GlobalContext,
  ) {
    super(belongingLayer, type, srcId, dstId, rawPacket, ctx);
    this.viewgraph = viewgraph;
  }

  setCurrEdge(edge: Edge) {
    this.currentEdge = edge;
  }

  getPacketLocation(): PacketLocation {
    const nextDevice = this.currentEdge.otherEnd(this.currentStart);
    return {
      prevDevice: this.currentStart,
      nextDevice,
      currProgress: this.progress,
    };
  }

  traverseEdge(edge: Edge, start: DeviceId): void {
    this.currentEdge = edge;
    this.currentStart = start;

    // lo agrega como hijo (despues sacarlo)
    this.currentEdge.registerPacket(this);
    Ticker.shared.add(this.animationTick, this);
  }

  async forwardPacket(currDeviceID: number) {
    const currDevice = this.viewgraph.getDevice(currDeviceID);
    console.debug(`[VIEW PACKET] ${currDeviceID} recibe el paquete`);
    const nextDeviceID = await currDevice.receivePacket(this);

    // Packet has reached its destination
    if (!nextDeviceID) {
      console.debug("[VIEW PACKET] Paquete llego a destino!");
      return;
    }

    const edgeToForward = this.viewgraph.getEdge(currDeviceID, nextDeviceID);

    // Packet has reached a dead end
    if (!edgeToForward) {
      console.debug("no hay arista!");
      return;
    }

    // Reset progress and start traversing the next edge
    this.progress = 0;

    // Update current edge and start
    this.currentStart = currDeviceID;
    this.currentEdge = edgeToForward;

    edgeToForward.registerPacket(this);
    Ticker.shared.add(this.animationTick, this);
  }

  async animationTick(ticker: Ticker) {
    const start = this.currentEdge.startPos;
    const end = this.currentEdge.endPos;

    const edgeLength = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2),
    );

    const normalizedSpeed = this.speed / edgeLength;

    if (!Packet.animationPaused) {
      const progressIncrement =
        (ticker.deltaMS * normalizedSpeed * this.ctx.getCurrentSpeed().value) /
        1000;
      this.progress += progressIncrement;
      this.updatePosition(this.currentEdge);
    }

    if (this.progress >= 1) {
      this.currentEdge.deregisterPacket(this);
      ticker.remove(this.animationTick, this);
      this.forwardPacket(this.currentEdge.otherEnd(this.currentStart));
    }
  }

  delete() {
    // Remove packet from Ticker to stop animation
    Ticker.shared.remove(this.animationTick, this);

    super.delete();
  }
}

export class DataPacket extends Packet {
  datagraph: DataGraph;
  currNextDevice: DeviceId;

  constructor(
    datagraph: DataGraph,
    belongingLayer: Layer,
    type: string,
    srcId: DeviceId,
    dstId: DeviceId,
    rawPacket: EthernetFrame,
    ctx: GlobalContext,
  ) {
    super(belongingLayer, type, srcId, dstId, rawPacket, ctx);
    this.datagraph = datagraph;
  }

  getPacketLocation(): PacketLocation {
    return {
      prevDevice: this.currentStart,
      nextDevice: this.currNextDevice,
      currProgress: this.progress,
    };
  }

  traverseEdge(start: DeviceId, end: DeviceId): void {
    this.currentStart = start;
    this.currNextDevice = end;

    Ticker.shared.add(this.animationTick, this);
  }

  async forwardPacket(currDeviceID: number) {
    const currDevice = this.datagraph.getDevice(currDeviceID);
    console.debug(`[DATA PACKET] ${currDeviceID} recibe el paquete`);
    const nextDeviceID = await currDevice.receivePacket(this);

    // Packet has reached its destination
    if (!nextDeviceID) {
      console.debug("[DATA PACKET] Paquete llego a destino!");
      this.delete();
      return;
    }

    // Reset progress and start traversing the next edge
    this.progress = 0;

    // Update current start and end
    this.currentStart = currDeviceID;
    this.currNextDevice = nextDeviceID;

    Ticker.shared.add(this.animationTick, this);
  }

  async animationTick(ticker: Ticker) {
    const currentStartDevice = this.datagraph.getDevice(this.currentStart);
    const currNextDevice = this.datagraph.getDevice(this.currNextDevice);
    const start = currentStartDevice.getPosition();
    const end = currNextDevice.getPosition();

    const edgeLength = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2),
    );

    const normalizedSpeed = this.speed / edgeLength;

    if (!Packet.animationPaused) {
      const progressIncrement =
        (ticker.deltaMS * normalizedSpeed * this.ctx.getCurrentSpeed().value) /
        1000;
      this.progress += progressIncrement;
      this.setPositionAlongEdge(start, end, this.progress);
    }

    if (this.progress >= 1) {
      ticker.remove(this.animationTick, this);
      this.forwardPacket(this.currNextDevice);
    }
  }

  delete() {
    // Remove packet from Ticker to stop animation
    Ticker.shared.remove(this.animationTick, this);

    super.delete();
  }
}

export function sendRawPacket(
  viewgraph: ViewGraph,
  belongingLayer: Layer,
  srcId: DeviceId,
  dstId: DeviceId,
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
    console.debug(otherDevice.mac);
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
  let type;
  if (rawPacket.payload instanceof IPv4Packet) {
    const payload = rawPacket.payload as IPv4Packet;
    type = payload.payload.getPacketType();
  } else {
    console.warn("Packet is not IPv4");
    type = "ICMP-8";
  }
  const packet = new ViewPacket(
    viewgraph,
    belongingLayer,
    type,
    srcId,
    dstId,
    rawPacket,
    viewgraph.ctx,
  );
  packet.traverseEdge(firstEdge, srcId);
}
