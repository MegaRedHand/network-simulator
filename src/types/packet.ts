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
import { EchoRequest, EchoReply } from "../packets/icmp";
import { DeviceId, isRouter } from "./graphs/datagraph";

const contextPerPacketType: Record<string, GraphicsContext> = {
  IP: circleGraphicsContext(Colors.Green, 0, 0, 5),
  ICMP: circleGraphicsContext(Colors.Red, 0, 0, 5),
};

const highlightedPacketContext = circleGraphicsContext(Colors.Violet, 0, 0, 6);

export class Packet extends Graphics {
  speed = 100;
  progress = 0;
  viewgraph: ViewGraph;
  currentEdge: Edge;
  currentStart: number;
  color: number;
  type: string;
  rawPacket: IPv4Packet;

  static animationPaused = false;

  static pauseAnimation() {
    Packet.animationPaused = true;
  }

  static unpauseAnimation() {
    Packet.animationPaused = false;
  }

  constructor(viewgraph: ViewGraph, type: string, rawPacket: IPv4Packet) {
    super();

    this.viewgraph = viewgraph;
    this.type = type;

    this.context = contextPerPacketType[this.type];
    this.zIndex = ZIndexLevels.Packet;

    this.rawPacket = rawPacket;

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

  private getPacketDetails(packet: IPv4Packet) {
    // Creates a dictionary with the data of the packet
    const packetDetails: Record<string, string | number | object> = {
      Version: packet.version,
      "Internet Header Length": packet.internetHeaderLength,
      "Type of Service": packet.typeOfService,
      "Total Length": packet.totalLength,
      Identification: packet.identification,
      Flags: packet.flags,
      "Fragment Offset": packet.fragmentOffset,
      "Time to Live": packet.timeToLive,
      Protocol: packet.protocol,
      "Header Checksum": packet.headerChecksum,
    };

    // Add payload details if available
    if (packet.payload instanceof EchoRequest) {
      const echoRequest = packet.payload as EchoRequest;
      packetDetails.Payload = {
        type: "EchoRequest",
        identifier: echoRequest.identifier,
        sequenceNumber: echoRequest.sequenceNumber,
        data: Array.from(echoRequest.data),
      };
    } else if (packet.payload instanceof EchoReply) {
      const echoReply = packet.payload as EchoReply;
      packetDetails.Payload = {
        type: "EchoReply",
        identifier: echoReply.identifier,
        sequenceNumber: echoReply.sequenceNumber,
        data: Array.from(echoReply.data),
      };
    } else {
      packetDetails.Payload = {
        type: "Unknown",
        protocol: packet.payload.protocol(),
      };
    }

    return packetDetails;
  }

  showInfo() {
    const rightbar = RightBar.getInstance();
    if (!rightbar) {
      console.error("RightBar instance not found.");
      return;
    }

    const info = new StyledInfo("Packet Information");
    info.addField("Type", this.type);
    info.addField("Source IP Address", this.rawPacket.sourceAddress.toString());
    info.addField(
      "Destination IP Address",
      this.rawPacket.destinationAddress.toString(),
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
    const packetDetails = this.getPacketDetails(this.rawPacket);

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

  routePacket(id: DeviceId): DeviceId | null {
    const device = this.viewgraph.getDataGraph().getDevice(id);
    if (!device || !isRouter(device)) {
      return null;
    }
    const result = device.routingTable.find((entry) => {
      const ip = IpAddress.parse(entry.ip);
      const mask = IpAddress.parse(entry.mask);
      console.log("considering entry:", entry);
      return this.rawPacket.destinationAddress.isInSubnet(ip, mask);
    });
    console.log("result:", result);
    return result === undefined ? null : result.iface;
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
    if (!Packet.animationPaused) {
      this.progress +=
        (ticker.deltaMS * normalizedSpeed * this.viewgraph.getSpeed().value) /
        1000;
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
    // Remove packet from Ticker to stop animation
    Ticker.shared.remove(this.animationTick, this);

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

// TODO: maybe make this receive the packet directly?
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

  if (!originDevice || !destinationDevice) {
    console.warn("Origen o destino no encontrado.");
    return;
  }

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
  const dstIp = destinationDevice.ip;
  const rawPacket = new IPv4Packet(originDevice.ip, dstIp, payload);
  const packet = new Packet(viewgraph, packetType, rawPacket);

  const originConnections = viewgraph.getConnections(originId);
  if (originConnections.length === 0) {
    console.warn(`No se encontró un dispositivo con ID ${originId}.`);
    return;
  }
  let firstEdge = originConnections.find((edge) => {
    return edge.otherEnd(originId) === destinationId;
  });
  if (firstEdge === undefined) {
    firstEdge = originConnections.find((edge) => {
      return isRouter(
        viewgraph.getDataGraph().getDevice(edge.otherEnd(originId)),
      );
    });
  }
  if (firstEdge === undefined) {
    console.warn(
      "El dispositivo de origen no está conectado al destino o a un router.",
    );
    return;
  }
  packet.traverseEdge(firstEdge, originId);
}

export function sendRawPacket(
  viewgraph: ViewGraph,
  srcId: DeviceId,
  rawPacket: IPv4Packet,
) {
  const srcIp = rawPacket.sourceAddress;
  const dstIp = rawPacket.destinationAddress;
  console.log(`Sending frame from ${srcIp.toString()} to ${dstIp.toString()}`);

  const originConnections = viewgraph.getConnections(srcId);
  if (originConnections.length === 0) {
    console.warn("El dispositivo de origen no tiene conexiones.");
    return;
  }
  let firstEdge = originConnections.find((edge) => {
    const otherId = edge.otherEnd(srcId);
    const otherDevice = viewgraph.getDevice(otherId);
    return otherDevice.ip.equals(dstIp);
  });
  if (firstEdge === undefined) {
    const datagraph = viewgraph.getDataGraph();
    firstEdge = originConnections.find((edge) => {
      const otherId = edge.otherEnd(srcId);
      return isRouter(datagraph.getDevice(otherId));
    });
  }
  if (firstEdge === undefined) {
    console.warn(
      "El dispositivo de origen no está conectado al destino o a un router.",
    );
    return;
  }
  const packet = new Packet(viewgraph, "ICMP", rawPacket);
  packet.traverseEdge(firstEdge, srcId);
}
