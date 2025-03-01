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
import { Layer } from "../types/devices/layer";
import { DeviceId, isRouter, isSwitch } from "./graphs/datagraph";
import { EthernetFrame } from "../packets/ethernet";

const contextPerPacketType: Record<string, GraphicsContext> = {
  IP: circleGraphicsContext(Colors.Green, 0, 0, 5),
  "ICMP-8": circleGraphicsContext(Colors.Red, 0, 0, 5),
  "ICMP-0": circleGraphicsContext(Colors.Yellow, 0, 0, 5),
};

const highlightedPacketContext = circleGraphicsContext(Colors.Violet, 0, 0, 6);

export class Packet extends Graphics {
  private packetId: string;
  speed = 100;
  progress = 0;
  viewgraph: ViewGraph;
  currentEdge: Edge;
  currentStart: number;
  color: number;
  type: string;
  rawPacket: EthernetFrame;
  srcId: DeviceId;
  dstId: DeviceId;

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
    srcId: DeviceId,
    dstId: DeviceId,
    rawPacket: EthernetFrame,
  ) {
    super();
    this.packetId = crypto.randomUUID();
    this.viewgraph = viewgraph;
    this.type = type;
    this.context = contextPerPacketType[this.type];
    this.zIndex = ZIndexLevels.Packet;
    this.srcId = srcId;
    this.dstId = dstId;
    this.rawPacket = rawPacket;
    this.interactive = true;
    this.cursor = "pointer";
    this.on("click", this.onClick, this);
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

    // Initialize logical tracking in DataGraph
    const nextDevice = edge.otherEnd(start);
    console.log(
      `[DATAGRAPH]: Initializing packet ${this.packetId} on edge ${start}->${nextDevice}`,
    );
    this.viewgraph
      .getDataGraph()
      .initializePacketProgress(this.packetId, start, nextDevice);

    this.currentEdge.addChild(this);
    this.updatePosition();
    Ticker.shared.add(this.animationTick, this);
  }

  async animationTick(ticker: Ticker) {
    if (this.progress >= 1) {
      this.progress = 0;
      this.removeFromParent();
      const newStart = this.currentEdge.otherEnd(this.currentStart);
      const newStartDevice = this.viewgraph.getDevice(newStart);

      if (!newStartDevice) {
        console.log("[DATAGRAPH]: Device not found, deleting packet");
        this.delete();
        return;
      }

      console.log(newStartDevice);

      this.currentStart = newStart;
      ticker.remove(this.animationTick, this);
      const newEndId = await newStartDevice.receivePacket(this);
      ticker.add(this.animationTick, this);

      if (newEndId === null) {
        console.log("[DATAGRAPH]: No next device, deleting packet");
        this.delete();
        return;
      }

      // Store current progress before updating
      const currentProgress = this.viewgraph
        .getDataGraph()
        .getPacketProgress(this.packetId);
      if (!currentProgress) {
        // Set the progress to 0 on the data edge
        console.log("[DATAGRAPH]: Packet progress not found, setting to 0");
        this.viewgraph
          .getDataGraph()
          .initializePacketProgress(this.packetId, newStart, newEndId);
      }

      // Update logical progress in DataGraph
      const success = this.viewgraph
        .getDataGraph()
        .movePacketToNextEdge(this.packetId, newEndId);

      if (!success) {
        console.log(
          "[DATAGRAPH]: Failed to move to next edge, deleting packet",
        );
        this.delete();
        return;
      }

      console.log(
        `[DATAGRAPH]: Moving packet from ${this.currentStart} to ${newEndId}`,
      );

      this.currentEdge = this.viewgraph.getEdge(
        Edge.generateConnectionKey({ n1: this.currentStart, n2: newEndId }),
      );

      if (this.currentEdge === undefined) {
        console.log("[DATAGRAPH]: No visual edge found, deleting packet");
        this.delete();
        return;
      }

      this.currentEdge.addChild(this);
    }

    // Rest of the method remains the same
    const start = this.currentEdge.startPos;
    const end = this.currentEdge.endPos;
    const edgeLength = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2),
    );

    const normalizedSpeed = this.speed / edgeLength;

    if (!Packet.animationPaused) {
      const progressIncrement =
        (ticker.deltaMS * normalizedSpeed * this.viewgraph.getSpeed()) / 1000;
      this.progress += progressIncrement;

      // Update logical progress in DataGraph
      this.viewgraph
        .getDataGraph()
        .updatePacketProgress(this.packetId, this.progress);

      // Log progress at 25% intervals
      if (
        Math.floor(this.progress * 4) >
        Math.floor((this.progress - progressIncrement) * 4)
      ) {
        console.log(
          `[DATAGRAPH]: Packet ${this.packetId} at ${(this.progress * 100).toFixed(0)}% of edge`,
        );
      }
    }

    this.updatePosition();
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

  delete() {
    // Remove logical tracking
    console.log(`[DATAGRAPH]: Removing packet ${this.packetId}`);
    this.viewgraph.getDataGraph().removePacketProgress(this.packetId);

    Ticker.shared.remove(this.animationTick, this);
    this.removeAllListeners();
    this.removeFromParent();

    if (isSelected(this)) {
      deselectElement();
    }

    this.destroy();
  }
}

export function sendRawPacket(
  viewgraph: ViewGraph,
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
  const packet = new Packet(viewgraph, "ICMP-8", srcId, dstId, rawPacket);
  packet.traverseEdge(firstEdge, srcId);
}
