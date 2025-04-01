import {
  FederatedPointerEvent,
  Graphics,
  GraphicsContext,
  Ticker,
} from "pixi.js";
import { deselectElement, isSelected, selectElement } from "./viewportManager";
import { circleGraphicsContext, Colors, ZIndexLevels } from "../utils/utils";
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
  TCP: circleGraphicsContext(Colors.Hazel, 0, 0, 5), // for HTTP
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

export class dPacket {
  private ctx: GlobalContext;
  private graph: DataGraph;
  // private packetId: number;

  private speed = 100;
  private progress = 0;
  private start: DeviceId;
  private end: DeviceId;
  rawPacket: EthernetFrame;

  constructor(ctx: GlobalContext, graph: DataGraph, rawPacket: EthernetFrame) {
    this.ctx = ctx;
    this.graph = graph;
    // TODO: register to packet manager
    // this.packetId = ctx.getViewGraph().getPacketManager().registerPacket(this);
  }

  getPacketContext() {
    return packetContext(this.rawPacket);
  }

  getProgress() {
    return this.progress;
  }

  traverseEdge(startId: DeviceId, endId: DeviceId): void {
    this.start = startId;
    this.end = endId;

    Ticker.shared.add(this.updateProgressTick, this);
  }

  private deliverPacket() {
    const newStartDevice = this.graph.getDevice(this.end);

    // Viewgraph may return undefined when trying to get the device
    // as the device may have been removed by the user.
    if (!newStartDevice) {
      return;
    }
    newStartDevice.receiveFrame(this.rawPacket);
  }

  private updateProgressTick(ticker: Ticker) {
    const startDevice = this.graph.getDevice(this.start);
    const endDevice = this.graph.getDevice(this.end);
    if (!startDevice) {
      console.warn("Current start device not found.");
      this.delete();
      return;
    }
    if (!endDevice) {
      console.warn("Current end device not found.");
      this.delete();
      return;
    }
    const start = startDevice.getPosition();
    const end = endDevice.getPosition();

    const edgeLength = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2),
    );

    const normalizedSpeed = this.speed / edgeLength;

    const progressIncrement =
      (ticker.deltaMS * normalizedSpeed * this.ctx.getCurrentSpeed()) / 1000;
    this.progress += progressIncrement;

    if (this.progress >= 1) {
      // Deliver packet
      this.deliverPacket();
      // Clean up
      this.delete();
    }
  }

  private delete() {
    // Remove packet from Ticker to stop animation
    Ticker.shared.remove(this.updateProgressTick, this);

    // Deregister packet from PacketManager
    // this.ctx.getViewGraph().getPacketManager().deregisterPacket(this.packetId);
    // this.destroy();
  }
}

export class vPacket extends Graphics {
  ctx: GlobalContext;
  private viewgraph: ViewGraph;
  private dataPacket: dPacket;

  private packetId: number;

  private start: DeviceId;
  private end: DeviceId;

  private type: string;
  belongingLayer: Layer;

  constructor(
    ctx: GlobalContext,
    viewgraph: ViewGraph,
    packet: dPacket,
  ) {
    super();
    this.viewgraph = viewgraph;
    const { type, layer } = packet.getPacketContext();
    this.belongingLayer = layer;
    this.type = type;
    this.context = contextPerPacketType[this.type];
    this.zIndex = ZIndexLevels.Packet;

    this.dataPacket = packet;
    this.ctx = ctx;
    this.interactive = true;
    this.cursor = "pointer";
    this.on("click", this.onClick, this);
    this.on("tap", this.onClick, this);
    // TODO: register in Packet Manger
    // this.packetId = ctx.getViewGraph().getPacketManager().registerPacket(this);
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
      startId: this.start,
      endId: this.end,
      currProgress: this.packetId,
    };
  }

  showInfo() {
    const rightbar = RightBar.getInstance();
    if (!rightbar) {
      console.error("RightBar instance not found.");
      return;
    }

    const info = new StyledInfo("Packet Information");
    const rawPacket = this.dataPacket.rawPacket;
    info.addField("Type", this.type);
    info.addField("Source MAC Address", rawPacket.source.toString());
    info.addField(
      "Destination MAC Address",
      rawPacket.destination.toString(),
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
      rawPacket,
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

  getProgress(): number {
    return this.dataPacket.getProgress();
  }

  getRawPacket(): EthernetFrame {
    return this.dataPacket.rawPacket;
  }


  traverseEdge(startId: DeviceId, endId: DeviceId) {
    this.start = startId;
    this.end = endId;

    const currEdge = this.viewgraph.getEdge(startId, endId);
    currEdge.addChild(this);
    Ticker.shared.add(this.travelAnimationTick, this);
  }

  travelAnimationTick() {
    const start = this.viewgraph.getDevice(this.start)?.getPosition();
    const end = this.viewgraph.getDevice(this.end)?.getPosition();
    if (!start) {
      console.warn("Start device not found.");
      this.delete();
      return;
    }
    if (!end) {
      console.warn("End device not found.");
      this.delete();
      return;
    }

    this.updatePositionAlongEdge(start, end);
  }

  /// Updates the position according to the current progress.
  private updatePositionAlongEdge(start: Position, end: Position) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const progress = this.dataPacket.getProgress();

    this.x = start.x + progress * dx;
    this.y = start.y + progress * dy;
  }

  animateDrop(deviceId: DeviceId) {
    // Drop the packet on the device
    const device = this.viewgraph.getDevice(deviceId);
    if (!device) {
      console.error("Device not found");
      return;
    }
    this.start = deviceId;
    device.addChild(this);
    // Position is relative to the device
    this.x = 0;
    this.y = device.height;
    Ticker.shared.add(this.dropAnimationTick, this);
  }

  // TODO: remove this
  private progress = 0;

  private dropAnimationTick(ticker: Ticker) {
    const device = this.viewgraph.getDevice(this.start);
    if (!device) {
      console.error("Device not found");
      return;
    }
    this.progress += (ticker.deltaMS * this.viewgraph.getSpeed()) / 1000;
    this.y = device.height + 30 * this.progress;
    let newAlpha = 1 - this.progress;
    if (newAlpha <= 0) {
      newAlpha = 0;
      // Clean up
      // TODO: clean up
      this.destroy();
      // ticker.remove(this.dropAnimationTick, this);
      if (isSelected(this)) {
        deselectElement();
      }
      this.removeFromParent();
    } else {
      this.alpha = newAlpha;
    }
  }

  delete() {
    // Remove packet from Ticker to stop animation
    Ticker.shared.remove(this.travelAnimationTick, this);
    Ticker.shared.remove(this.dropAnimationTick, this);

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
  const dataPacket = new dPacket(viewgraph.ctx, viewgraph.getDataGraph(), rawPacket);
  dataPacket.traverseEdge(srcId, firstEdge.otherEnd(srcId));
  const packet = new vPacket(viewgraph.ctx, viewgraph, dataPacket);
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
  const packet = new dPacket(datagraph.ctx, datagraph, rawPacket);
  packet.traverseEdge(srcId, firstHop);
}

export function dropPacket(
  viewgraph: ViewGraph,
  srcId: DeviceId,
  rawPacket: EthernetFrame,
) {
  const dataPacket = new dPacket(viewgraph.ctx, viewgraph.getDataGraph(), rawPacket);
  const packet = new vPacket(viewgraph.ctx, viewgraph, dataPacket);
  packet.animateDrop(srcId);
}
