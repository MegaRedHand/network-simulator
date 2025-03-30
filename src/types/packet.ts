import {
  FederatedPointerEvent,
  Graphics,
  GraphicsContext,
  Ticker,
} from "pixi.js";
import { Edge } from "./edge";
import { deselectElement, isSelected, selectElement } from "./viewportManager";
import { circleGraphicsContext, Colors, ZIndexLevels } from "../utils/utils";
import { RightBar, StyledInfo } from "../graphics/right_bar";
import { Position } from "./common";
import { ViewGraph } from "./graphs/viewgraph";
import { Layer } from "../types/devices/layer";
//import { EchoMessage } from "../packets/icmp";
import { DeviceId, isRouter, isSwitch } from "./graphs/datagraph";
import { EthernetFrame } from "../packets/ethernet";
import { IPv4Packet } from "../packets/ip";

const contextPerPacketType: Record<string, GraphicsContext> = {
  IP: circleGraphicsContext(Colors.Green, 0, 0, 5),
  "ICMP-8": circleGraphicsContext(Colors.Red, 0, 0, 5),
  "ICMP-0": circleGraphicsContext(Colors.Yellow, 0, 0, 5),
  TCP: circleGraphicsContext(Colors.Hazel, 0, 0, 5), // for HTTP
};

const highlightedPacketContext = circleGraphicsContext(Colors.Violet, 0, 0, 6);

export class Packet extends Graphics {
  viewgraph: ViewGraph;

  private speed = 100;
  private progress = 0;
  private currentEdge: Edge;
  private currentStart: number;
  private type: string;
  private rawPacket: EthernetFrame;

  constructor(viewgraph: ViewGraph, type: string, rawPacket: EthernetFrame) {
    super();

    this.viewgraph = viewgraph;
    this.type = type;

    this.context = contextPerPacketType[this.type];
    this.zIndex = ZIndexLevels.Packet;

    this.rawPacket = rawPacket;

    this.interactive = true;
    this.cursor = "pointer";
    this.on("click", this.onClick, this);
    // NOTE: this is "click" for mobile devices
    this.on("tap", this.onClick, this);
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
      this.viewgraph.getLayer(),
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

  traverseEdge(edge: Edge, start: DeviceId): void {
    this.progress = 0;
    this.currentEdge = edge;
    this.currentStart = start;
    // Add packet as a child of the current edge
    this.currentEdge.addChild(this);
    this.updatePosition();
    Ticker.shared.add(this.animationTick, this);
  }

  animationTick(ticker: Ticker) {
    if (this.progress >= 1) {
      // Deliver packet
      this.deliverPacket();

      // Clean up
      this.destroy();
      ticker.remove(this.animationTick, this);
      if (isSelected(this)) {
        deselectElement();
      }
      this.removeFromParent();
      return;
    }

    // Calculate the edge length
    const start = this.currentEdge.startPos;
    const end = this.currentEdge.endPos;
    const edgeLength = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2),
    );

    // Normalize the speed based on edge length
    // The longer the edge, the slower the progress increment
    const normalizedSpeed = this.speed / edgeLength;

    // Update progress with normalized speed
    this.progress +=
      (ticker.deltaMS * normalizedSpeed * this.viewgraph.getSpeed()) / 1000;

    this.updatePosition();
  }

  deliverPacket() {
    const newStart = this.currentEdge.otherEnd(this.currentStart);
    const newStartDevice = this.viewgraph.getDevice(newStart);

    // Viewgraph may return undefined when trying to get the device
    // as the device may have been removed by the user.
    if (!newStartDevice) {
      return;
    }
    newStartDevice.receiveFrame(this.rawPacket);
  }

  updatePosition() {
    const startPos = this.currentEdge.nodePosition(this.currentStart);
    const endPos = this.currentEdge.nodePosition(
      this.currentEdge.otherEnd(this.currentStart),
    );
    this.setPositionAlongEdge(startPos, endPos, this.progress);
  }

  /// Updates the position according to the current progress.
  setPositionAlongEdge(start: Position, end: Position, progress: number) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

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
    this.currentStart = deviceId;
    device.addChild(this);
    // Position is relative to the device
    this.x = 0;
    this.y = device.height;
    Ticker.shared.add(this.dropAnimationTick, this);
  }

  dropAnimationTick(ticker: Ticker) {
    const device = this.viewgraph.getDevice(this.currentStart);
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

    // Remove all event listeners
    this.removeAllListeners();

    // Remove packet from parent edge
    this.removeFromParent();

    // Deselect the packet if it's selected
    if (isSelected(this)) {
      deselectElement();
    }

    // Destroy the packet
    this.destroy();
  }
}

function getPacketType(rawPacket: EthernetFrame): string {
  let type;
  if (rawPacket.payload instanceof IPv4Packet) {
    const payload = rawPacket.payload as IPv4Packet;
    type = payload.payload.getPacketType();
  } else {
    console.warn("Packet is not IPv4");
    type = "ICMP-8";
  }
  return type;
}

export function sendRawPacket(
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
      return isRouter(otherDevice) || isSwitch(otherDevice);
    });
  }
  if (firstEdge === undefined) {
    console.warn(
      "El dispositivo de origen no está conectado al destino, a un router o a un switch.",
    );
    return;
  }
  const type = getPacketType(rawPacket);
  const packet = new Packet(viewgraph, type, rawPacket);
  packet.traverseEdge(firstEdge, srcId);
}

export function dropPacket(
  viewgraph: ViewGraph,
  srcId: DeviceId,
  rawPacket: EthernetFrame,
) {
  const type = getPacketType(rawPacket);
  const packet = new Packet(viewgraph, type, rawPacket);
  packet.animateDrop(srcId);
}
