import {
  Texture,
  Sprite,
  FederatedPointerEvent,
  Graphics,
  TextStyle,
  Text,
  Container,
} from "pixi.js";
import { ViewGraph } from "../graphs/viewgraph";
import {
  deselectElement,
  refreshElement,
  selectElement,
  urManager,
} from "../viewportManager";
import { RightBar } from "../../graphics/right_bar";
import { Colors, ZIndexLevels } from "../../utils/utils";
import { Position } from "../common";
import { DeviceInfo } from "../../graphics/renderables/device_info";
import { IpAddress } from "../../packets/ip";
import { DeviceId, RemovedNodeData } from "../graphs/datagraph";
import { DragDeviceMove, AddEdgeMove } from "../undo-redo";
import { Layer } from "../layer";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { GlobalContext } from "../../context";

export enum DeviceType {
  Host = 0,
  Router = 1,
  Switch = 2,
}

export function layerFromType(type: DeviceType) {
  switch (type) {
    case DeviceType.Router:
      return Layer.Network;
    case DeviceType.Host:
      return Layer.App;
    case DeviceType.Switch:
      return Layer.Link;
  }
}

export abstract class ViewDevice extends Container {
  private sprite: Sprite;

  readonly id: DeviceId;
  readonly viewgraph: ViewGraph;
  ctx: GlobalContext;

  mac: MacAddress;
  arpTable: Map<IpAddress, MacAddress> = new Map<IpAddress, MacAddress>();

  highlightMarker: Graphics | null = null; // Marker to indicate selection

  static dragTarget: ViewDevice | null = null;
  static connectionTarget: ViewDevice | null = null;
  static startPosition: Position | null = null;

  get width(): number {
    return this.sprite.width;
  }
  get height(): number {
    return this.sprite.height;
  }

  /**
   * Each type of device has different ways of handling a received packet.
   * Returns the id for the next device to send the packet to, or
   * null if there’s no next device to send the packet.
   * */
  abstract receiveFrame(frame: EthernetFrame, senderId: DeviceId): void;
  //                                        would be the interface

  constructor(
    id: DeviceId,
    texture: Texture,
    viewgraph: ViewGraph,
    ctx: GlobalContext,
    position: Position,
    mac: MacAddress,
  ) {
    super();

    this.id = id;
    this.viewgraph = viewgraph;
    this.ctx = ctx;

    this.mac = mac;

    this.sprite = new Sprite(texture);

    this.sprite.anchor.set(0.5);
    this.sprite.setSize(50);
    this.addChild(this.sprite);

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
    // NOTE: this is "click" for mobile devices
    this.on("tap", this.onClick, this);
  }

  // Function to add the ID label to the device
  addDeviceIdLabel() {
    const textStyle = new TextStyle({
      fontSize: 12,
      fill: Colors.Black,
      align: "center",
      fontWeight: "bold",
    });
    const idText = new Text({ text: `ID: ${this.id}`, style: textStyle });
    idText.anchor.set(0.5);
    idText.y = this.height * 0.8;
    idText.zIndex = ZIndexLevels.Label;
    this.addChild(idText); // Add the ID text as a child of the device
  }

  getPosition(): Position {
    return { x: this.x, y: this.y };
  }

  delete(): RemovedNodeData {
    const deviceData = this.viewgraph.removeDevice(this.id);
    console.log(`Device ${this.id} deleted`);
    this.destroy();
    return deviceData;
  }

  onPointerDown(event: FederatedPointerEvent): void {
    if (!ViewDevice.connectionTarget) {
      selectElement(this);
    }
    ViewDevice.dragTarget = this;

    // Guardar posición inicial
    ViewDevice.startPosition = { x: this.x, y: this.y };
    event.stopPropagation();

    // Listen to global pointermove and pointerup events
    this.parent.on("pointermove", onPointerMove);
    this.parent.on("pointerup", onPointerUp);
  }

  onClick(e: FederatedPointerEvent) {
    e.stopPropagation();

    if (!ViewDevice.connectionTarget) {
      selectElement(this);
      return;
    }
    // If the stored device is this, ignore
    if (ViewDevice.connectionTarget === this) {
      return;
    }
    // Connect both devices
    const n1 = ViewDevice.connectionTarget.id;
    const n2 = this.id;
    const move = new AddEdgeMove(this.viewgraph.getLayer(), { n1, n2 });
    if (urManager.push(this.viewgraph, move)) {
      refreshElement();
      ViewDevice.connectionTarget = null;
    }
  }

  selectToConnect() {
    if (ViewDevice.connectionTarget) {
      ViewDevice.connectionTarget = null;
      return;
    }
    ViewDevice.connectionTarget = this;
  }

  highlight() {
    if (this.highlightMarker) {
      return;
    }
    // Create the square as a selection marker
    this.highlightMarker = new Graphics();

    // NOTE: we get the original size since pixijs autoscales the sprite's children
    const { width, height } = this;

    this.highlightMarker.roundRect(-width / 2, -height / 2, width, height, 5);
    this.highlightMarker.stroke({
      width: 3,
      color: this.ctx.get_select_color(),
      alpha: 0.6,
    });
    this.highlightMarker.fill({
      color: this.ctx.get_select_color(),
      alpha: 0.1,
    });
    this.highlightMarker.zIndex = ZIndexLevels.Device;

    // Make the unselected edges transparent to improve visibility
    this.viewgraph.transparentEdgesForDevice(this.id);

    // Ensure the marker is in the same container as the viewport
    this.addChild(this.highlightMarker);
  }

  removeHighlight() {
    if (this.highlightMarker) {
      this.highlightMarker.clear(); // Clear the graphic
      this.removeChild(this.highlightMarker); // Remove the marker from the viewport
      this.highlightMarker.destroy(); // Destroy the graphic object to free memory
      this.viewgraph.untransparentEdges(); // Make the edges opaque again
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
    ViewDevice.connectionTarget = null;
  }

  // Return the device’s type.
  abstract getType(): DeviceType;

  // Return the device’s layer.
  abstract getLayer(): Layer;

  destroy() {
    deselectElement();
    super.destroy();
  }
}

function onPointerMove(event: FederatedPointerEvent): void {
  if (ViewDevice.dragTarget) {
    ViewDevice.dragTarget.parent.toLocal(
      event.global,
      null,
      ViewDevice.dragTarget.position,
    );

    // Notify view graph about its movement
    ViewDevice.dragTarget.viewgraph.deviceMoved(ViewDevice.dragTarget.id);
  }
}

function onPointerUp(): void {
  const target = ViewDevice.dragTarget;
  if (target && ViewDevice.startPosition) {
    const endPosition: Position = {
      x: target.x,
      y: target.y,
    };
    console.log("Finalizing move for device:", {
      id: target.id,
      startPosition: ViewDevice.startPosition,
      endPosition,
    });

    if (
      ViewDevice.startPosition.x === endPosition.x &&
      ViewDevice.startPosition.y === endPosition.y
    ) {
      console.log(
        `No movement detected for device ID ${target.id}. Move not registered.`,
      );
    } else {
      const move = new DragDeviceMove(
        target.viewgraph.getLayer(),
        target.id,
        ViewDevice.startPosition,
        endPosition,
      );
      urManager.push(target.viewgraph, move);
    }

    // Reset static variables
    ViewDevice.startPosition = null;

    // Remove global pointermove and pointerup events
    target.parent.off("pointermove", onPointerMove);
    target.parent.off("pointerup", onPointerUp);
    ViewDevice.dragTarget = null;
  }
}
