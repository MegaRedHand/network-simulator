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
import { DeviceType } from "./devices/device";

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

export class Packet extends Graphics {
  packetId: string;
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

  getPacketLocation(): PacketLocation {
    const nextDevice = this.currentEdge.otherEnd(this.currentStart);
    return {
      prevDevice: this.currentStart,
      nextDevice,
      currProgress: this.progress,
    };
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

  reloadLocation(newPrevDevice: number, newNextDevice: number) {
    this.currentStart = newPrevDevice;
    const currEdge = this.viewgraph.getEdge(
      Edge.generateConnectionKey({ n1: newPrevDevice, n2: newNextDevice }),
    );
    if (!currEdge) {
      // hacer algo
      console.debug("CurrEdge no existe!");
      this.delete();
      return;
    }
    const nextDevice = this.viewgraph.getDevice(newNextDevice);
    if (
      nextDevice.getType() == DeviceType.Router ||
      nextDevice.getType() == DeviceType.Host
    ) {
      this.rawPacket.destination = nextDevice.mac;
    }
    this.currentEdge = currEdge;
    currEdge.registerPacket(this);
    Ticker.shared.add(this.animationTick, this);
  }

  traverseEdge(edge: Edge, start: DeviceId): void {
    this.currentEdge = edge;
    this.currentStart = start;

    this.currentEdge.registerPacket(this);
    Ticker.shared.add(this.animationTick, this);

    // OPCION 2
    // recibe el id de un dispositivo
    // dispositivo <- consigo disposito con nuevoDispositivoId
    // idArista <- dispositivo.procesarPaquete
    // arsita <- consigo aristo con idArsita
    // arista.sendPacket()
  }

  async forwardPacket(currDeviceID: number) {
    const currDevice = this.viewgraph.getDevice(currDeviceID);
    console.debug(`${currDeviceID} recibe el paquete`);
    const nextDeviceID = await currDevice.receivePacket(this);

    // Packet has reached its destination
    if (!nextDeviceID) {
      console.debug("Paquet llego a destino!");
      return;
    }

    const edgeToForward = this.viewgraph.getEdge(
      Edge.generateConnectionKey({ n1: currDeviceID, n2: nextDeviceID }),
    );

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
        (ticker.deltaMS * normalizedSpeed * this.viewgraph.getSpeed()) / 1000;
      this.progress += progressIncrement;
      this.updatePosition(this.currentEdge);
    }

    if (this.progress >= 1) {
      this.currentEdge.deregisterPacket(this);
      ticker.remove(this.animationTick, this);
      this.forwardPacket(this.currentEdge.otherEnd(this.currentStart));
    }
  }

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
    // Remove packet from Ticker to stop animation
    Ticker.shared.remove(this.animationTick, this);

    // Remove logical tracking
    console.log(`[DATAGRAPH]: Removing packet ${this.packetId}`);
    this.viewgraph.getDataGraph().removePacketProgress(this.packetId);

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
