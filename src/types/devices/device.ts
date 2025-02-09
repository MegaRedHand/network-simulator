import {
  Texture,
  Sprite,
  FederatedPointerEvent,
  Graphics,
  TextStyle,
  Text,
} from "pixi.js";
import { ViewGraph } from "./../graphs/viewgraph";
import {
  deselectElement,
  refreshElement,
  selectElement,
  urManager,
} from "./../viewportManager";
import { RightBar } from "../../graphics/right_bar";
import { Colors, ZIndexLevels } from "../../utils";
import { Position } from "../common";
import { DeviceInfo } from "../../graphics/renderables/device_info";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DeviceId } from "../graphs/datagraph";
import { DragDeviceMove, AddEdgeMove } from "../undo-redo";
import { Layer } from "./layer";
import { Packet, sendRawPacket } from "../packet";
import { EchoReply } from "../../packets/icmp";
import { CreateDevice } from "./utils";

export { Layer } from "./layer";

export enum DeviceType {
  Router = 0,
  Host = 1,
}

export function layerFromType(type: DeviceType) {
  switch (type) {
    case DeviceType.Router:
      return Layer.Network;
    case DeviceType.Host:
      return Layer.App;
  }
}

export abstract class Device extends Sprite {
  readonly id: DeviceId;
  readonly viewgraph: ViewGraph;
  connections = new Set<DeviceId>();

  highlightMarker: Graphics | null = null; // Marker to indicate selection

  static dragTarget: Device | null = null;
  static connectionTarget: Device | null = null;
  static startPosition: Position | null = null;

  ip: IpAddress;
  ipMask: IpAddress;

  // Each type of device has different ways of handling a received packet.
  // Returns the DevicedId for the next device to send the packet to, or
  // null if there’s no next device to send the packet.
  // TODO: Might be general for all device in the future.
  abstract receivePacket(packet: Packet): DeviceId | null;

  constructor(
    id: DeviceId,
    svg: string,
    viewgraph: ViewGraph,
    position: Position,
    ip: IpAddress,
    ipMask: IpAddress,
  ) {
    super(Texture.from(svg));
    this.id = id;
    this.viewgraph = viewgraph;
    this.ip = ip;
    this.ipMask = ipMask;

    this.anchor.set(0.5);
    this.setSize(48);

    this.x = position.x;
    this.y = position.y;

    this.eventMode = "static";
    this.interactive = true;
    this.cursor = "pointer";
    this.zIndex = ZIndexLevels.Device;

    // Add device ID label using the helper function
    this.addDeviceIdLabel();

    this.on("pointerdown", this.onPointerDown, this);
    this.on("click", this.onClick, this);
  }

  // Function to add the ID label to the device
  addDeviceIdLabel() {
    const textStyle = new TextStyle({
      fontSize: 12 / this.scale.x,
      fill: Colors.Black,
      align: "center",
      fontWeight: "bold",
    });
    const idText = new Text({ text: `ID: ${this.id}`, style: textStyle });
    idText.anchor.set(0.5);
    idText.y = this.texture.height * 0.8;
    idText.zIndex = ZIndexLevels.Label;
    this.addChild(idText); // Add the ID text as a child of the device
  }

  getConnections(): DeviceId[] {
    return Array.from(this.connections.values());
  }

  /// Returns the data needed to create the device
  getCreateDevice(): CreateDevice {
    const node = this.viewgraph.getDataGraph().getDevice(this.id);
    return { id: this.id, node };
  }

  addConnection(adyacentId: DeviceId) {
    this.connections.add(adyacentId);
  }

  removeConnection(id: DeviceId) {
    this.connections.delete(id);
  }

  // TODO: Most probably it will be different for each type of device
  handlePacket(packet: Packet) {
    switch (packet.type) {
      case "ICMP-8": {
        const dstDevice = this.viewgraph.getDeviceByIP(
          packet.rawPacket.sourceAddress,
        );
        if (dstDevice) {
          const echoReply = new EchoReply(0);
          const ipPacket = new IPv4Packet(this.ip, dstDevice.ip, echoReply);
          sendRawPacket(this.viewgraph, this.id, ipPacket);
        }
        break;
      }
      default:
        console.warn("Packet’s type unrecognized");
    }
  }

  delete(): void {
    this.viewgraph.removeDevice(this.id);
    // Clear connections
    this.connections.clear();
    deselectElement();
    console.log(`Device ${this.id} deleted`);
    this.destroy();
  }

  onPointerDown(event: FederatedPointerEvent): void {
    console.log("Entered onPointerDown");
    if (!Device.connectionTarget) {
      selectElement(this);
    }
    Device.dragTarget = this;

    // Guardar posición inicial
    Device.startPosition = { x: this.x, y: this.y };
    event.stopPropagation();

    // Listen to global pointermove and pointerup events
    this.parent.on("pointermove", onPointerMove);
    this.parent.on("pointerup", onPointerUp);
  }

  connectTo(adyacentId: DeviceId): boolean {
    // Connects both devices with an edge.
    // console.log("Entered connectTo");

    const edgeId = this.viewgraph.addEdge(this.id, adyacentId);
    if (edgeId) {
      const adyacentDevice = this.viewgraph.getDevice(adyacentId);
      this.addConnection(adyacentId);
      adyacentDevice.addConnection(this.id);

      // Register move
      const move = new AddEdgeMove({ n1: this.id, n2: adyacentId });
      urManager.push(move);

      return true;
    }
    return false;
  }

  onClick(e: FederatedPointerEvent) {
    e.stopPropagation();

    if (!Device.connectionTarget) {
      selectElement(this);
      return;
    }
    // If the stored device is this, reset it
    if (Device.connectionTarget === this) {
      return;
    }
    // The "LineStart" device ends up as the end of the drawing but it's the same
    if (this.connectTo(Device.connectionTarget.id)) {
      refreshElement();
      Device.connectionTarget = null;
    }
  }

  selectToConnect() {
    if (Device.connectionTarget) {
      Device.connectionTarget = null;
      return;
    }
    Device.connectionTarget = this;
  }

  highlight() {
    if (this.highlightMarker) {
      return;
    }
    // Create the square as a selection marker
    this.highlightMarker = new Graphics();

    // NOTE: we get the original size since pixijs autoscales the sprite's children
    const { width, height } = this.texture;

    this.highlightMarker.roundRect(-width / 2, -height / 2, width, height, 5);
    this.highlightMarker.stroke({
      width: 3,
      color: Colors.Violet,
      alpha: 0.6,
    });
    this.highlightMarker.fill({ color: Colors.Violet, alpha: 0.1 });
    this.highlightMarker.zIndex = ZIndexLevels.Device;

    // Ensure the marker is in the same container as the viewport
    this.addChild(this.highlightMarker);
  }

  removeHighlight() {
    if (this.highlightMarker) {
      this.highlightMarker.clear(); // Clear the graphic
      this.removeChild(this.highlightMarker); // Remove the marker from the viewport
      this.highlightMarker.destroy(); // Destroy the graphic object to free memory
      this.highlightMarker = null;
    }
  }

  showInfo(): void {
    RightBar.getInstance().renderInfo(new DeviceInfo(this));
  }

  select() {
    this.highlight(); // Calls highlight on select
    this.showInfo();
  }

  deselect() {
    this.removeHighlight(); // Calls removeHighlight on deselect
    Device.connectionTarget = null;
  }

  // Cleans up related resources
  destroy() {
    // do nothing
  }

  // Return the device’s type.
  abstract getType(): DeviceType;

  // Return the device’s layer.
  abstract getLayer(): Layer;
}

function onPointerMove(event: FederatedPointerEvent): void {
  if (Device.dragTarget) {
    Device.dragTarget.parent.toLocal(
      event.global,
      null,
      Device.dragTarget.position,
    );

    // Notify view graph about its movement
    Device.dragTarget.viewgraph.deviceMoved(Device.dragTarget.id);
  }
}

function onPointerUp(): void {
  if (Device.dragTarget && Device.startPosition) {
    const endPosition: Position = {
      x: Device.dragTarget.x,
      y: Device.dragTarget.y,
    };
    console.log("Finalizing move for device:", {
      id: Device.dragTarget.id,
      startPosition: Device.startPosition,
      endPosition,
    });

    if (
      Device.startPosition.x === endPosition.x &&
      Device.startPosition.y === endPosition.y
    ) {
      console.log(
        `No movement detected for device ID ${Device.dragTarget.id}. Move not registered.`,
      );
    } else {
      const move = new DragDeviceMove(
        Device.dragTarget.id,
        Device.startPosition,
        endPosition,
      );
      urManager.push(move);
    }

    // Resetear variables estáticas
    Device.startPosition = null;

    // Remove global pointermove and pointerup events
    Device.dragTarget.parent.off("pointermove", onPointerMove);
    Device.dragTarget.parent.off("pointerup", onPointerUp);
    Device.dragTarget = null;
  }
}
