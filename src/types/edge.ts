import { Graphics, Point, Text } from "pixi.js";
import { ViewGraph } from "./graphs/viewgraph";
import { ViewDevice } from "./view-devices/index"; // Import the Device class
import { deselectElement, selectElement } from "./viewportManager";
import { RightBar } from "../graphics/right_bar";
import { Colors, ZIndexLevels } from "../utils/utils";
import { Packet } from "./packet";
import { EdgeInfo } from "../graphics/renderables/edge_info";
import { DataEdge, DeviceId } from "./graphs/datagraph";
import { MacAddress } from "../packets/ethernet";
import { MultiEdgeInfo } from "../graphics/renderables/multi_edge_info";
import {
  hideTooltip,
  removeTooltip,
  showTooltip,
} from "../graphics/renderables/canvas_tooltip_manager";
import { updateRoutingTableIface } from "./network-modules/tables/routing_table";
import { updateForwardingTablePort } from "./network-modules/tables/forwarding_table";

export class Edge extends Graphics {
  private _data: DataEdge;
  private startPos: Point;
  private endPos: Point;
  private highlightedEdges: Edge[] = [];
  private startTooltip: Text | null = null; // Tooltip for the start of the edge
  private endTooltip: Text | null = null; // Tooltip for the end of the edge

  viewgraph: ViewGraph;

  // This is to always have the same data as the datagraph
  get data(): DataEdge {
    return this.viewgraph
      .getDataGraph()
      .getConnection(this._data.from.id, this._data.to.id);
  }

  constructor(viewgraph: ViewGraph, edgeData: DataEdge) {
    super();
    this._data = edgeData;
    this.viewgraph = viewgraph;

    this.eventMode = "static";
    this.interactive = true;
    this.cursor = "pointer";
    this.setupHoverTooltip();
    this.on("click", () => selectElement(this));
    // NOTE: this is "click" for mobile devices
    this.on("tap", () => selectElement(this));

    this.refresh();
  }

  refresh() {
    const n1 = this.data.from.id;
    const n2 = this.data.to.id;
    const device1 = this.viewgraph.getDevice(n1);
    const device2 = this.viewgraph.getDevice(n2);
    this.updatePosition(device1, device2);
  }

  nodePosition(nodeId: DeviceId): Point | undefined {
    return this.data.from.id === nodeId
      ? this.startPos
      : this.data.to.id === nodeId
        ? this.endPos
        : undefined;
  }

  getDeviceIds(): DeviceId[] {
    if (!this.data) return [];
    return [this.data.from.id, this.data.to.id];
  }

  otherEnd(nodeId: DeviceId): DeviceId | undefined {
    return this.data.from.id === nodeId
      ? this.data.to.id
      : this.data.to.id === nodeId
        ? this.data.from.id
        : undefined;
  }

  getData(): DataEdge {
    return this.data;
  }

  /**
   * Returns the interface number associated with the specified device ID in this edge connection.
   * If the given device is part of the connection (either as the source or destination), the corresponding
   * interface number is returned. If the device is not involved in the connection, returns `undefined`.
   *
   * @param id - The ID of the device for which to retrieve the interface number.
   * @returns The interface number if the device is part of the connection; otherwise, `undefined`.
   */
  getDeviceInterface(id: DeviceId): number | undefined {
    if (!(id === this.data.from.id || id === this.data.to.id)) {
      return;
    }
    return this.data.from.id === id ? this.data.from.iface : this.data.to.iface;
  }

  // Method to draw the line
  drawEdge(startPos: Point, endPos: Point, color: number) {
    this.clear();

    // Draw a colored line
    this.moveTo(startPos.x, startPos.y);
    this.lineTo(endPos.x, endPos.y);
    this.stroke({ width: 4, color });

    // Add a bigger transparent hitbox
    this.moveTo(startPos.x, startPos.y);
    this.lineTo(endPos.x, endPos.y);
    this.stroke({ width: 12, alpha: 0 });

    this.zIndex = ZIndexLevels.Edge;
    this.startPos = startPos;
    this.endPos = endPos;

    this.children.forEach((child) => {
      if (child instanceof Packet) {
        child.updatePosition();
      }
    });
  }

  select() {
    this.highlightedEdges = this.viewgraph.findConnectedEdges(this);
    this.highlightedEdges.forEach((edge) => {
      edge.highlight();
      // Highlight the color of the circles connected to this edge
      edge.getDeviceIds().forEach((deviceId) => {
        const device = this.viewgraph.getDevice(deviceId);
        device.setCircleColor(Colors.Violet);
      });
    });
    this.showInfo();
  }

  deselect() {
    this.highlightedEdges.forEach((edge) => {
      edge.removeHighlight();
      // Reset the color of the circles connected to this edge
      edge.getDeviceIds().forEach((deviceId) => {
        const device = this.viewgraph.getDevice(deviceId);
        device.setCircleColor(Colors.Lightblue);
      });
    });
    this.highlightedEdges = [];
  }

  highlight() {
    this.drawEdge(this.startPos, this.endPos, Colors.Violet);
  }

  removeHighlight() {
    this.drawEdge(this.startPos, this.endPos, Colors.Lightblue);
  }

  showInfo() {
    if (this.isMerged()) {
      const multiEdgeInfo = new MultiEdgeInfo(this.highlightedEdges);
      RightBar.getInstance().renderInfo(multiEdgeInfo);
    } else {
      const edgeInfo = new EdgeInfo(this);
      RightBar.getInstance().renderInfo(edgeInfo);
    }
  }

  isMerged(): boolean {
    return this.highlightedEdges.length > 1;
  }

  destroy(): void {
    deselectElement();
    this.removeTooltips();
    super.destroy();
  }

  makeVisible() {
    this.visible = true;
  }

  updateVisibility(): void {
    const device1 = this.viewgraph.getDevice(this.data.from.id);
    const device2 = this.viewgraph.getDevice(this.data.to.id);

    if (!device1 || !device2) {
      console.warn(
        `One or both devices for edge ${this.data.from.id} ↔ ${this.data.to.id} are missing.`,
      );
      this.visible = false;
      return;
    }

    // Get visible devices reachable from each device
    const device1CanReachVisibleDevice = this.viewgraph.canReachVisibleDevice(
      device1.id,
      device2.id,
    );
    const device2CanReachVisibleDevice = this.viewgraph.canReachVisibleDevice(
      device2.id,
      device1.id,
    );

    // Update the visibility of the edge
    this.visible = device1CanReachVisibleDevice && device2CanReachVisibleDevice;
  }

  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Updates the position of an edge connecting two devices, taking into account their visibility
   * and dimensions. If a device is visible, the edge will leave a space around the device's center
   * to account for its size. Otherwise, the edge will connect directly to the device's position.
   *
   * @param device1 - The first device (starting point of the edge).
   * @param device2 - The second device (ending point of the edge).
   */
  private updatePosition(device1: ViewDevice, device2: ViewDevice) {
    const dx = device2.x - device1.x;
    const dy = device2.y - device1.y;
    const angle = Math.atan2(dy, dx);

    const n1IsVisible = device1.isVisible();
    const n2IsVisible = device2.isVisible();

    const offsetX1 = n1IsVisible
      ? ((device1.width + 5) / 2) * Math.cos(angle)
      : 0;
    const offsetY1 = n1IsVisible
      ? ((device1.height + 5) / 2) * Math.sin(angle)
      : 0;
    const offsetX2 = n2IsVisible
      ? ((device2.width + 5) / 2) * Math.cos(angle)
      : 0;
    const offsetY2 = n2IsVisible
      ? ((device2.height + 5) / 2) * Math.sin(angle)
      : 0;

    const newStartPos: Point = new Point(
      device1.x + offsetX1,
      device1.y + offsetY1,
    );
    const newEndPos: Point = new Point(
      device2.x - offsetX2,
      device2.y - offsetY2,
    );

    this.drawEdge(newStartPos, newEndPos, Colors.Lightblue);
  }

  setInterface(deviceId: DeviceId, newIface: number) {
    let oldIface: number;
    if (this.data.from.id === deviceId) {
      oldIface = this.data.from.iface;
      this.data.from.iface = newIface;
    } else {
      oldIface = this.data.to.iface;
      this.data.to.iface = newIface;
    }

    updateRoutingTableIface(
      this.viewgraph.getDataGraph(),
      deviceId,
      oldIface,
      newIface,
    );

    updateForwardingTablePort(
      this.viewgraph.getDataGraph(),
      deviceId,
      oldIface,
      newIface,
    );
  }

  setInterfaceMac(deviceId: DeviceId, mac: string): void {
    let iface;
    if (this.data.from.id === deviceId) {
      iface = this.data.from.iface;
    } else {
      iface = this.data.to.iface;
    }
    const device = this.viewgraph.getDataGraph().getDevice(deviceId);

    if (!device) {
      console.error(`Device with ID ${deviceId} not found.`);
      return;
    }
    device.interfaces[iface].mac = MacAddress.parse(mac);
    console.log(
      `Updated MAC address for device ${deviceId}, interface ${iface}: ${mac}`,
    );
  }

  getDeviceFreeIfaces(deviceId: DeviceId): number[] {
    const freeIfaces = this.viewgraph
      .getDataGraph()
      .getFreeInterfaces(deviceId);
    return freeIfaces;
  }

  private setupHoverTooltip() {
    this.on("mouseover", () => {
      const group = this.viewgraph.findConnectedEdges(this);
      group.forEach((edge) => {
        edge.handleConnectedDevicesTooltips(
          (device: ViewDevice, iface: number) => {
            if (!device) {
              console.error(
                `Device ${device.id} not found in viewgraph, cannot set device tooltip`,
              );
              return;
            }
            if (device.isVisible()) {
              device.setupToolTip(iface);
            }
          },
        );
        edge.showTooltips();
        edge.fixTooltipPositions();
      });
    });
    this.on("mouseout", () => {
      const group = this.viewgraph.findConnectedEdges(this);
      group.forEach((edge) => {
        edge.handleConnectedDevicesTooltips((device: ViewDevice) => {
          if (!device) {
            console.error(
              `Device ${device.id} not found in viewgraph, cannot set device tooltip`,
            );
            return;
          }
          device.hideToolTip();
        });
        edge.hideTooltips();
      });
    });
  }

  private showTooltips() {
    const startIface = this.data.from.iface;
    const endIface = this.data.to.iface;

    const offsetX = 20;
    const offsetY = -10;

    this.startTooltip = showTooltip(
      this,
      `eth${startIface}`,
      this.startPos.x + offsetX,
      this.startPos.y + offsetY,
      this.startTooltip,
    );

    this.endTooltip = showTooltip(
      this,
      `eth${endIface}`,
      this.endPos.x - offsetX,
      this.endPos.y + offsetY,
      this.endTooltip,
    );
  }

  handleConnectedDevicesTooltips(
    handleTooltip: (device: ViewDevice, iface?: number) => void,
  ) {
    const [startId, startIface] = [this.data.from.id, this.data.from.iface];
    const [endId, endIface] = [this.data.to.id, this.data.to.iface];
    const startDevice = this.viewgraph.getDevice(startId);
    const endDevice = this.viewgraph.getDevice(endId);

    const deviceFound = (device: ViewDevice, id: DeviceId) => {
      if (!device) {
        console.error(
          `Device ${id} not found in viewgraph, cannot set device tooltip`,
        );
        return false;
      }
      return true;
    };

    if (deviceFound(startDevice, startId))
      handleTooltip(startDevice, startIface);

    if (deviceFound(endDevice, endId)) handleTooltip(endDevice, endIface);
  }

  private fixTooltipPositions() {
    const offsetX = 20; // Offset on the X-axis to move it away from the device
    const offsetY = -10; // Offset on the Y-axis to bring it closer to the Edge

    // Determine if the start point is to the left or right of the end point
    const isStartLeft = this.startPos.x < this.endPos.x;

    // Check the visibility of the starting device
    const device1 = this.viewgraph.getDevice(this.data.from.id);
    if (this.startTooltip) {
      if (device1 && device1.isVisible()) {
        // If the starting device is visible, update the tooltip position
        this.startTooltip.x =
          this.startPos.x + (isStartLeft ? offsetX : -offsetX);
        this.startTooltip.y = this.startPos.y + offsetY;
        this.startTooltip.visible = true;
      } else {
        // If not visible, hide the tooltip
        this.startTooltip.visible = false;
      }
    }

    // Check the visibility of the ending device
    const device2 = this.viewgraph.getDevice(this.data.to.id);
    if (this.endTooltip) {
      if (device2 && device2.isVisible()) {
        // If the ending device is visible, update the tooltip position
        this.endTooltip.x = this.endPos.x + (isStartLeft ? -offsetX : offsetX);
        this.endTooltip.y = this.endPos.y + offsetY;
        this.endTooltip.visible = true;
      } else {
        // If not visible, hide the tooltip
        this.endTooltip.visible = false;
      }
    }
  }

  private hideTooltips() {
    hideTooltip(this.startTooltip);
    hideTooltip(this.endTooltip);
  }

  private removeTooltips() {
    this.handleConnectedDevicesTooltips((device: ViewDevice) =>
      device.hideToolTip(),
    );
    this.startTooltip = removeTooltip(this, this.startTooltip);
    this.endTooltip = removeTooltip(this, this.endTooltip);
  }
}
