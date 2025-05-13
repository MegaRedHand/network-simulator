import {
  FederatedPointerEvent,
  Graphics,
  GraphicsContext,
  Ticker,
  Text,
} from "pixi.js";
import { deselectElement, isSelected, selectElement } from "./viewportManager";
import { circleGraphicsContext, Colors, ZIndexLevels } from "../utils/utils";
import { RightBar } from "../graphics/right_bar";
import { Position } from "./common";
import { ViewGraph } from "./graphs/viewgraph";
import { Layer, layerIncluded } from "./layer";
import { DataGraph, DeviceId } from "./graphs/datagraph";
import {
  EthernetFrame,
  IP_PROTOCOL_TYPE,
  ARP_PROTOCOL_TYPE,
} from "../packets/ethernet";
import {
  ICMP_PROTOCOL_NUMBER,
  IPv4Packet,
  TCP_PROTOCOL_NUMBER,
} from "../packets/ip";
import { GlobalContext } from "../context";
import { DataRouter, DataSwitch } from "./data-devices";
import {
  ICMP_REPLY_TYPE_NUMBER,
  ICMP_REQUEST_TYPE_NUMBER,
  IcmpPacket,
} from "../packets/icmp";
import { PacketInfo } from "../graphics/renderables/packet_info";
import {
  hideTooltip,
  removeTooltip,
  showTooltip,
} from "../graphics/renderables/canvas_tooltip_manager";

const contextPerPacketType: Record<string, GraphicsContext> = {
  HTTP: circleGraphicsContext(Colors.Hazel, 5), // for HTTP
  IP: circleGraphicsContext(Colors.Green, 5),
  "ICMP-8": circleGraphicsContext(Colors.Red, 5),
  "ICMP-0": circleGraphicsContext(Colors.Yellow, 5),
  ARP: circleGraphicsContext(Colors.Green, 5),
  EMPTY: circleGraphicsContext(Colors.Grey, 5),
};

const highlightedPacketContext = circleGraphicsContext(Colors.Violet, 6);

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
    } else if (datagram.payload.protocol() === TCP_PROTOCOL_NUMBER) {
      // TODO: change when we have a TCP packet
      return { type: "HTTP", layer: Layer.App };
    }
  }
  if (frame.payload.type() === ARP_PROTOCOL_TYPE)
    return { type: "ARP", layer: Layer.Link };
  return { type: "EMPTY", layer: Layer.Link };
}

export class Packet extends Graphics {
  packetId: string;
  speed = 100;
  progress = 0;
  currStart: DeviceId;
  currEnd: DeviceId;
  viewgraph: ViewGraph;
  type: string;
  rawPacket: EthernetFrame;
  ctx: GlobalContext;
  belongingLayer: Layer;
  tooltip: Text | null = null;

  constructor(
    ctx: GlobalContext,
    viewgraph: ViewGraph,
    rawPacket: EthernetFrame,
  ) {
    super();
    this.packetId = crypto.randomUUID();
    this.viewgraph = viewgraph;
    const { type, layer } = packetContext(rawPacket);
    this.belongingLayer = layer;
    this.type = type;
    this.context = contextPerPacketType[this.type];
    this.zIndex = ZIndexLevels.Packet;

    this.visible = layerIncluded(layer, viewgraph.getLayer());

    this.rawPacket = rawPacket;
    this.ctx = ctx;
    this.interactive = true;
    this.cursor = "pointer";
    this.setupHoverTooltip();
    this.on("click", this.onClick, this);
    this.on("tap", this.onClick, this);
    // register in Packet Manager
    viewgraph.getPacketManager().registerPacket(this);
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

  getPacketDetails(layer: Layer, rawPacket: EthernetFrame) {
    return rawPacket.getDetails(layer);
  }

  isVisible(): boolean {
    return this.visible;
  }

  getPacketLocation(): PacketLocation {
    return {
      startId: this.currStart,
      endId: this.currEnd,
      currProgress: this.progress,
    };
  }

  showInfo() {
    const info = new PacketInfo(this);
    RightBar.getInstance().renderInfo(info);
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
    const newStartDevice = this.viewgraph.getDevice(this.currEnd);

    // Viewgraph may return undefined when trying to get the device
    // as the device may have been removed by the user.
    if (!newStartDevice) {
      return;
    }
    newStartDevice.receiveFrame(this.rawPacket, this.currStart);
  }

  traverseEdge(startId: DeviceId, endId: DeviceId): void {
    this.currStart = startId;
    this.currEnd = endId;

    const currEdge = this.viewgraph.getEdge(startId, endId);
    currEdge.addChild(this);
    const start = currEdge.nodePosition(this.currStart);
    const end = currEdge.nodePosition(this.currEnd);
    this.updatePosition(start, end);

    Ticker.shared.add(this.animationTick, this);
  }

  animationTick(ticker: Ticker) {
    const currEdge = this.viewgraph.getEdge(this.currStart, this.currEnd);
    if (!currEdge) {
      console.warn(
        `No edge connecting devices ${this.currStart} and ${this.currEnd} in viewgraph`,
      );
      this.delete();
      return;
    }
    const start = currEdge.nodePosition(this.currStart);
    const end = currEdge.nodePosition(this.currEnd);

    const edgeLength = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2),
    );

    const normalizedSpeed = this.speed / edgeLength;

    const progressIncrement =
      (ticker.deltaMS * normalizedSpeed * this.ctx.getCurrentSpeed()) / 1000;
    this.progress += progressIncrement;
    this.updatePosition(start, end);

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
        this.viewgraph.getDevice(this.currStart).getPosition(),
        this.viewgraph.getDevice(this.currEnd).getPosition(),
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

  animateDrop(deviceId: DeviceId) {
    if (this.viewgraph instanceof DataGraph) {
      // If the packet is in the datagraph, we don't need to animate it
      return;
    }
    // Drop the packet on the device
    const device = this.viewgraph.getDevice(deviceId);
    if (!device) {
      console.error("Device not found");
      return;
    }
    this.currStart = deviceId;
    device.addChild(this);
    // Position is relative to the device
    this.x = 0;
    this.y = device.height;
    Ticker.shared.add(this.dropAnimationTick, this);
  }

  dropAnimationTick(ticker: Ticker) {
    if (this.viewgraph instanceof DataGraph) {
      // This shouldn't happen
      return;
    }
    const device = this.viewgraph.getDevice(this.currStart);
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
      this.destroy();
      ticker.remove(this.dropAnimationTick, this);
      if (isSelected(this)) {
        deselectElement();
      }
      this.removeFromParent();
    }
    this.alpha = newAlpha;
  }

  delete() {
    // Remove packet from Ticker to stop animation
    Ticker.shared.remove(this.animationTick, this);
    Ticker.shared.remove(this.dropAnimationTick, this);

    this.removeAllListeners();

    // Remove packet from the edge
    this.removeFromParent();

    if (isSelected(this)) {
      deselectElement();
    }

    // Deregister packet from PacketManager
    this.ctx.getViewGraph().getPacketManager().deregisterPacket(this.packetId);
    removeTooltip(this, this.tooltip);
    this.destroy();
  }

  private setupHoverTooltip() {
    this.on("mouseover", () => {
      this.tooltip = showTooltip(this, this.type, 0, -15, this.tooltip);
    });

    this.on("mouseout", () => {
      hideTooltip(this.tooltip);
    });
  }
}

// TODO: Replace and nextHopId with the sending interface. Like this, the function
//       can manage to send the packet to each one of the interface connection.
export function sendViewPacket(
  viewgraph: ViewGraph,
  srcId: DeviceId,
  rawPacket: EthernetFrame,
  nextHopId?: DeviceId,
) {
  const srcMac = rawPacket.source;
  const dstMac = rawPacket.destination;
  console.debug(
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
  if (firstEdge === undefined && !nextHopId) {
    console.warn(
      "El dispositivo de origen no está conectado al destino, a un router o a un switch.",
    );
    return;
  }
  const packet = new Packet(viewgraph.ctx, viewgraph, rawPacket);
  packet.traverseEdge(srcId, nextHopId ? nextHopId : firstEdge.otherEnd(srcId));
}

export function dropPacket(
  viewgraph: ViewGraph,
  srcId: DeviceId,
  rawPacket: EthernetFrame,
) {
  const packet = new Packet(viewgraph.ctx, viewgraph, rawPacket);
  packet.animateDrop(srcId);
}
