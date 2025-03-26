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
  protected speed = 100;
  protected progress = 0;
  protected currStart: DeviceId;
  protected currEnd: DeviceId;
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
    belongingLayer: Layer,
    type: string,
    rawPacket: EthernetFrame,
    ctx: GlobalContext,
  ) {
    super();
    this.packetId = crypto.randomUUID();
    this.belongingLayer = belongingLayer;
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

  getCurrStart(): DeviceId {
    return this.currStart;
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

  abstract deliverPacket(): void;

  updatePosition(edge: Edge) {
    const startPos = edge.nodePosition(this.currStart);
    const endPos = edge.nodePosition(edge.otherEnd(this.currStart));
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
    rawPacket: EthernetFrame,
    ctx: GlobalContext,
  ) {
    super(belongingLayer, type, rawPacket, ctx);
    this.viewgraph = viewgraph;
  }

  setCurrEdge(edge: Edge) {
    this.currentEdge = edge;
  }

  getPacketLocation(): PacketLocation {
    const nextDevice = this.currentEdge.otherEnd(this.currStart);
    return {
      prevDevice: this.currStart,
      nextDevice,
      currProgress: this.progress,
    };
  }

  deliverPacket() {
    const newStart = this.currentEdge.otherEnd(this.currStart);
    const newStartDevice = this.viewgraph.getDevice(newStart);

    // Viewgraph may return undefined when trying to get the device
    // as the device may have been removed by the user.
    if (!newStartDevice) {
      return;
    }
    newStartDevice.receiveFrame(this.rawPacket);
  }

  traverseEdge(edge: Edge, start: DeviceId): void {
    this.currentEdge = edge;
    this.currStart = start;

    // lo agrega como hijo (despues sacarlo)
    this.currentEdge.addChild(this);
    this.updatePosition(this.currentEdge);
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
      // Deliver packet
      this.deliverPacket();
      // Clean up
      this.delete();
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
    rawPacket: EthernetFrame,
    ctx: GlobalContext,
  ) {
    super(belongingLayer, type, rawPacket, ctx);
    this.datagraph = datagraph;
  }

  getPacketLocation(): PacketLocation {
    return {
      prevDevice: this.currStart,
      nextDevice: this.currNextDevice,
      currProgress: this.progress,
    };
  }

  deliverPacket() {
    const newStartDevice = this.datagraph.getDevice(this.currNextDevice);

    // Viewgraph may return undefined when trying to get the device
    // as the device may have been removed by the user.
    if (!newStartDevice) {
      return;
    }
    newStartDevice.receiveFrame(this.rawPacket);
  }

  traverseEdge(start: DeviceId, end: DeviceId): void {
    this.currStart = start;
    this.currNextDevice = end;

    Ticker.shared.add(this.animationTick, this);
  }

  async animationTick(ticker: Ticker) {
    const currStartDevice = this.datagraph.getDevice(this.currStart);
    const currNextDevice = this.datagraph.getDevice(this.currNextDevice);
    if (!currStartDevice) {
      console.warn("Current start device not found.");
      this.delete();
      return;
    }
    if (!currNextDevice) {
      console.warn("Current next device not found.");
      this.delete();
      return;
    }
    const start = currStartDevice.getPosition();
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
      // Deliver packet
      this.deliverPacket();
      // Clean up
      this.delete();
    }
  }

  delete() {
    // Remove packet from Ticker to stop animation
    Ticker.shared.remove(this.animationTick, this);

    super.delete();
  }
}

export function sendRawPacket(
  graph: ViewGraph | DataGraph,
  belongingLayer: Layer,
  srcId: DeviceId,
  rawPacket: EthernetFrame,
  isV: boolean = true,
) {
  if (isV) {
    sendViewPacket(graph as ViewGraph, belongingLayer, srcId, rawPacket);
  } else {
    sendDataPacket(graph as DataGraph, belongingLayer, srcId, rawPacket);
  }
}

function sendViewPacket(
  viewgraph: ViewGraph,
  belongingLayer: Layer,
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
    rawPacket,
    viewgraph.ctx,
  );
  packet.traverseEdge(firstEdge, srcId);
}

function sendDataPacket(
  datagraph: DataGraph,
  belongingLayer: Layer,
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
    console.debug(otherDevice.mac);
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
  let type;
  if (rawPacket.payload instanceof IPv4Packet) {
    const payload = rawPacket.payload as IPv4Packet;
    type = payload.payload.getPacketType();
  } else {
    console.warn("Packet is not IPv4");
    type = "ICMP-8";
  }
  const packet = new DataPacket(
    datagraph,
    belongingLayer,
    type,
    rawPacket,
    datagraph.ctx,
  );
  packet.traverseEdge(srcId, firstHop);
}
