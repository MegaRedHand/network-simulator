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
import { Colors, createDeviceIcon, ZIndexLevels } from "../../utils/utils";
import { Position } from "../common";
import { DeviceInfo } from "../../graphics/renderables/device_info";
import {
  DeviceId,
  NetworkInterfaceData,
  RemovedNodeData,
} from "../graphs/datagraph";
import { DragDeviceMove, AddEdgeMove } from "../undo-redo";
import { Layer, layerIncluded } from "../layer";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { GlobalContext } from "../../context";
import { IpAddress } from "../../packets/ip";
import {
  hideTooltip,
  removeTooltip,
  showTooltip,
} from "../../graphics/renderables/canvas_tooltip_manager";

const CIRCLE_RADIUS = 6; // Radius of the circle for drag and drop

export enum DeviceType {
  Host = 0,
  Router = 1,
  Switch = 2,
}

export interface NetworkInterface {
  name: string;
  mac: MacAddress;
  // TODO: add IP address
  ip?: IpAddress;
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
  private tooltip: Text | null = null; // Tooltip como un Text de PIXI.js
  private tag: string | null = null; // Tag for the device
  private isDragCircle = false;
  private circleGraphic?: Graphics;
  private idLabel?: Text;
  private isVisibleFlag = true; // Flag to track visibility
  private deviceIcons: Record<string, Text | undefined> = {};
  private deviceTooltips: Record<string, Text | undefined> = {};

  readonly id: DeviceId;
  readonly viewgraph: ViewGraph;
  ctx: GlobalContext;

  interfaces: NetworkInterface[] = [];

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
  abstract receiveFrame(frame: EthernetFrame, iface: number): void;

  constructor(
    id: DeviceId,
    texture: Texture,
    viewgraph: ViewGraph,
    ctx: GlobalContext,
    position: Position,
    interfaces: NetworkInterfaceData[],
    tag: string | null,
  ) {
    super();

    this.id = id;
    this.tag = tag;
    this.viewgraph = viewgraph;
    this.ctx = ctx;

    this.interfaces = interfaces.map((iface) => ({
      name: iface.name,
      mac: MacAddress.parse(iface.mac),
      ip: iface.ip !== undefined ? IpAddress.parse(iface.ip) : undefined,
    }));

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
    this.setTag(tag);
    this.updateVisibility();

    // Set up tooltip behavior
    // this.setupHoverTooltip();

    this.on("pointerdown", this.onPointerDown, this);
    this.on("click", this.onClick, this);
    // NOTE: this is "click" for mobile devices
    this.on("tap", this.onClick, this);
  }

  // Some devices require to do some initializations right after the viewgraph
  // finishes initializing.
  initialize() {
    // Do nothing
  }

  setupToolTip(iface: number) {
    const currentLayer = this.ctx.getCurrentLayer();
    const tooltipMessage = this.getTooltipDetails(currentLayer, iface);
    this.tooltip = showTooltip(
      this,
      tooltipMessage,
      0,
      this.height * 0.8 + 20,
      this.tooltip,
    );
  }

  hideToolTip() {
    hideTooltip(this.tooltip);
  }

  removeToolTip() {
    removeTooltip(this, this.tooltip);
  }

  setCircleColor(color: number) {
    if (!this.isDragCircle) return;
    if (this.circleGraphic) {
      this.circleGraphic.clear();
      this.circleGraphic.circle(0, 0, CIRCLE_RADIUS);
      this.circleGraphic.fill({ color });
    }
  }

  /**
   * Abstract method to get tooltip details based on the layer.
   * Must be implemented by derived classes.
   * @param layer - The network layer for which to retrieve tooltip details.
   * @param iface - The index of the network interface to provide details for.
   * @returns A string with the tooltip content to display.
   */
  abstract getTooltipDetails(layer: Layer, iface: number): string;

  updateDevicesAspect() {
    if (!this.isVisibleFlag) {
      for (const iconKey in this.deviceIcons) {
        this.hideDeviceIcon(iconKey);
      }
      const edges = this.viewgraph
        .getConnections(this.id)
        .filter((e) => e.isVisible());
      // if it doesn't have visible edges, hide it completely
      if (!edges || edges.length === 0) {
        this.visible = false;
        return;
      }
      // if it has visible edges, show it as a drag circle
      this.visible = true;
      this.setAsDragCircle();
    } else {
      // if it is in the current layer, show it as a normal device
      this.visible = true;
      this.setAsNormalDevice();
    }
  }

  updateVisibility() {
    this.isVisibleFlag = layerIncluded(
      this.getLayer(),
      this.viewgraph.getLayer(),
    );
  }

  private setAsDragCircle() {
    if (this.isDragCircle) return;
    this.isDragCircle = true;

    if (this.sprite) this.sprite.visible = false;
    if (this.idLabel) this.idLabel.visible = false;
    if (!this.circleGraphic) {
      this.circleGraphic = new Graphics();
      this.circleGraphic.circle(0, 0, CIRCLE_RADIUS);
      this.circleGraphic.fill({ color: Colors.Lightblue });
      this.addChild(this.circleGraphic);
    }
    this.eventMode = "static";
    this.interactive = true;
    this.cursor = "grab";
  }

  private setAsNormalDevice() {
    if (!this.isDragCircle) return;
    this.isDragCircle = false;

    if (this.sprite) this.sprite.visible = true;
    if (this.idLabel) this.idLabel.visible = true;
    if (this.circleGraphic) {
      this.removeChild(this.circleGraphic);
      this.circleGraphic.destroy();
      this.circleGraphic = undefined;
    }
    this.cursor = "pointer";
  }

  isVisible(): boolean {
    return this.isVisibleFlag;
  }

  ownMac(mac: MacAddress): boolean {
    return this.interfaces.some((iface) => iface.mac.equals(mac));
  }

  // Function to add the ID label to the device
  addDeviceIdLabel() {
    // Remove previous label if exists
    if (this.idLabel) {
      this.removeChild(this.idLabel);
      this.idLabel.destroy();
    }
    const textStyle = new TextStyle({
      fontSize: 12,
      fill: Colors.Black,
      align: "center",
      fontWeight: "bold",
    });
    const labelText = this.tag
      ? `ID: ${this.id} - ${this.tag}`
      : `ID: ${this.id}`;
    this.idLabel = new Text({ text: labelText, style: textStyle });
    this.idLabel.anchor.set(0.5);
    this.idLabel.y = this.height * 0.8;
    this.idLabel.zIndex = ZIndexLevels.Label;
    this.addChild(this.idLabel);
  }

  setTag(tag: string | null) {
    this.tag = tag && tag.trim() !== "" ? tag : null;
    this.viewgraph.getDataGraph().modifyDevice(this.id, (device) => {
      if (device) {
        device.tag = this.tag;
      }
    });
    this.addDeviceIdLabel();
  }

  getTag(): string | null {
    return this.tag;
  }

  getIdentifier(): string {
    return this.tag ?? `Device ${this.id.toString()}`;
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
      ViewDevice.connectionTarget = null;
      return;
    }

    // if the device is not visible, ignore
    if (!this.isVisibleFlag || !ViewDevice.connectionTarget.isVisibleFlag) {
      ViewDevice.connectionTarget = null;
      return;
    }

    // Connect both devices
    const n1 = ViewDevice.connectionTarget.id;
    const n2 = this.id;
    const move = new AddEdgeMove(this.viewgraph.getLayer(), n1, n2);
    if (urManager.push(this.viewgraph, move)) {
      refreshElement();
    }
    ViewDevice.connectionTarget = null;
  }

  selectToConnect() {
    // if the device is not visible, do nothing
    if (!this.isVisibleFlag) {
      return;
    }
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
      color: Colors.Violet,
      alpha: 0.6,
    });
    this.highlightMarker.fill({
      color: Colors.Violet,
      alpha: 0.1,
    });
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

  showDeviceIconFor(
    iconKey: string,
    emoji: string,
    yOffset: number,
    tooltipText: string | undefined,
    durationMs: number,
  ) {
    this.showDeviceIcon(iconKey, emoji, yOffset, tooltipText);
    setTimeout(() => {
      this.hideDeviceIcon(iconKey);
    }, durationMs);
  }

  showDeviceIcon(
    iconKey: string,
    emoji: string,
    yOffset: number,
    tooltipText?: string,
  ) {
    if (!this.isVisible()) return;
    if (this.deviceIcons[iconKey]) return;
    const icon = createDeviceIcon(emoji, yOffset);
    this.deviceIcons[iconKey] = icon;

    if (tooltipText) {
      icon.on("pointerover", () => {
        this.deviceTooltips[iconKey] = showTooltip(
          this,
          tooltipText,
          0,
          yOffset - 30,
          this.deviceTooltips[iconKey],
        );
      });
      icon.on("pointerout", () => {
        hideTooltip(this.deviceTooltips[iconKey]);
      });
    }

    this.addChild(icon);
  }

  hideDeviceIcon(iconKey: string) {
    const icon = this.deviceIcons[iconKey];
    if (icon) {
      this.removeChild(icon);
      icon.destroy();
      this.deviceIcons[iconKey] = undefined;
    }
    const tooltip = this.deviceTooltips[iconKey];
    if (tooltip) {
      removeTooltip(this, tooltip);
      this.deviceTooltips[iconKey] = undefined;
    }
  }

  select() {
    if (this.isDragCircle) return;
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
    removeTooltip(this, this.tooltip); // Remove the tooltip if it exists
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
