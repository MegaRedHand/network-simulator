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
} from "./../viewportManager";
import { RightBar } from "../../graphics/right_bar";
import { Colors, ZIndexLevels } from "../../utils";
import { Position } from "../common";
import { DeviceInfo } from "../../graphics/renderables/device_info";
import { IpAddress } from "../../packets/ip";

export const DEVICE_SIZE = 20;

export enum Layer {
  App = 0,
  Transport = 1,
  Network = 2,
  Link = 3,
}

export enum DeviceType {
  Router = 0,
  Host = 1,
}

export abstract class Device extends Sprite {
  readonly id: number;
  readonly viewgraph: ViewGraph;
  connections = new Map<number, number>();

  highlightMarker: Graphics | null = null; // Marker to indicate selection

  static dragTarget: Device | null = null;
  static connectionTarget: Device | null = null;

  ip: IpAddress;
  ip_mask: IpAddress;

  constructor(
    id: number,
    svg: string,
    viewgraph: ViewGraph,
    position: Position,
    ip: IpAddress,
    ip_mask: IpAddress,
  ) {
    super(Texture.from(svg));
    this.id = id;
    this.viewgraph = viewgraph;
    this.ip = ip;
    this.ip_mask = ip_mask;

    this.anchor.set(0.5);

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
      fontSize: 12,
      fill: Colors.Black,
      align: "center",
    });
    const idText = new Text({ text: `ID: ${this.id}`, style: textStyle });
    idText.anchor.set(0.5);
    idText.y = this.height - 15;
    idText.zIndex = ZIndexLevels.Label;
    this.addChild(idText); // Add the ID text as a child of the device
  }

  getConnections(): { edgeId: number; adyacentId: number }[] {
    return Array.from(this.connections.entries()).map(
      ([edgeId, adyacentId]) => {
        return { edgeId, adyacentId };
      },
    );
  }

  addConnection(edgeId: number, adyacentId: number) {
    this.connections.set(edgeId, adyacentId);
  }

  removeConnection(id: number) {
    this.connections.delete(id);
  }

  resize(sprite: Sprite): void {
    sprite.width = sprite.width / 70;
    sprite.height = sprite.height / DEVICE_SIZE;
  }

  delete(): void {
    this.viewgraph.removeDevice(this.id);
    // Clear connections
    this.connections.clear();
    deselectElement();
  }

  onPointerDown(event: FederatedPointerEvent): void {
    console.log("Entered onPointerDown");
    if (!Device.connectionTarget) {
      selectElement(this);
    }
    Device.dragTarget = this;
    event.stopPropagation();

    // Listen to global pointermove and pointerup events
    this.parent.on("pointermove", onPointerMove);
    this.parent.on("pointerup", onPointerUp);
  }

  connectTo(adyacentId: number): boolean {
    // Connects both devices with an edge.
    // console.log("Entered connectTo");

    const edgeId = this.viewgraph.addEdge(this.id, adyacentId);
    if (edgeId) {
      const adyacentDevice = this.viewgraph.getDevice(adyacentId);
      this.addConnection(edgeId, adyacentId);
      adyacentDevice.addConnection(edgeId, this.id);
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
    Device.connectionTarget = this;
  }

  highlight() {
    if (this.highlightMarker) {
      return;
    }
    // Create the square as a selection marker
    this.highlightMarker = new Graphics();

    this.highlightMarker.roundRect(
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
      5,
    );
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

  // Return the device’s type.
  abstract getType(): DeviceType;

  // Return the device’s layer.
  abstract getLayer(): Layer;
}

function onPointerMove(event: FederatedPointerEvent): void {
  console.log("Entered onPointerMove");
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
  console.log("Entered onPointerUp");
  if (Device.dragTarget) {
    // Remove global pointermove and pointerup events
    Device.dragTarget.parent.off("pointermove", onPointerMove);
    Device.dragTarget.parent.off("pointerup", onPointerUp);
    Device.dragTarget = null;
  }
}
