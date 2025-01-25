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
import { Device } from "./devices";

const contextPerPacketType: Record<string, GraphicsContext> = {
  IP: circleGraphicsContext(Colors.Green, 0, 0, 5),
  "ICMP-0": circleGraphicsContext(Colors.Red, 0, 0, 5),
  "ICMP-8": circleGraphicsContext(Colors.Yellow, 0, 0, 5),
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
  destinationDevice: Device = null; // Cambiarlo

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
    console.log("Termino traverseEdge");
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
      // console.log("result:", result);
      return result === undefined ? null : result.iface;
    }
    return null;
  }

  animationTick(ticker: Ticker) {
    if (this.progress >= 1) {
      const deleteSelf = () => {
        this.destroy();
        ticker.remove(this.animationTick, this);
        if (isSelected(this)) {
          deselectElement();
        }
        console.log("Se corto animationTick");
      };

      if (this.destinationDevice) {
        this.destinationDevice.receivePacket(this);
        deleteSelf();
        return;
      }

      this.progress = 0;
      this.removeFromParent();
      const newStart = this.currentEdge.otherEnd(this.currentStart);
      this.currentStart = newStart;
      const newEndId = this.routePacket(newStart);

      if (newEndId === null) {
        deleteSelf();
        return;
      }

      const newEndDevice = this.viewgraph.getDevice(newEndId);

      if (this.rawPacket.destinationAddress == newEndDevice.ip) {
        this.destinationDevice = newEndDevice;
      }
      const currentNodeEdges = this.viewgraph.getConnections(newStart);
      this.currentEdge = currentNodeEdges.find((edge) => {
        return edge.otherEnd(newStart) === newEndId;
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

// TODO: Remove?
// - packetType; manage in a more effective way the packet’s type so it can handle it without the paremeter.
// - originId and destinationId; logic regarding this two parameters ought to be manage with ip addresses,
//   or else, by obtaining both ids inside the function.
export function sendPacket(
  viewgraph: ViewGraph,
  rawPacket: IPv4Packet,
  packetType: string,
  originId: DeviceId,
  destinationId: DeviceId,
) {
  console.log(
    `Sending ${packetType} packet from ${rawPacket.sourceAddress} to ${rawPacket.destinationAddress}`,
  );

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
      return isRouter(viewgraph.datagraph.getDevice(edge.otherEnd(originId)));
    });
  }
  if (firstEdge === undefined) {
    console.warn(
      "El dispositivo de origen no está conectado al destino o a un router.",
    );
    return;
  }
  packet.traverseEdge(firstEdge, originId);
  console.log("Termino sendPacket");
}
