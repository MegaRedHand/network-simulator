import {
  Texture,
  Sprite,
  FederatedPointerEvent,
  Graphics,
  TextStyle,
  Text,
} from "pixi.js";
import { Packet } from "./../packet";
import { ViewGraph } from "./../graphs/viewgraph";
import {
  deselectElement,
  refreshElement,
  selectElement,
} from "./../viewportManager";
import { RightBar } from "../../right_bar";
import { Colors, ZIndexLevels } from "../../utils";
import { Position } from "../common";

export const DEVICE_SIZE = 20;

let selectedDeviceId: number | null = null; // Stores only the ID instead of 'this'

export function setSelectedDeviceId(value: number | null) {
  selectedDeviceId = value;
}

export class Device extends Sprite {
  id: number;
  dragging = false;
  viewgraph: ViewGraph;
  connections = new Map<number, number>();
  offsetX = 0;
  offsetY = 0;
  rightbar: RightBar;
  highlightMarker: Graphics | null = null; // Marker to indicate selection

  static dragTarget: Device | null = null;

  constructor(
    id: number,
    svg: string,
    viewgraph: ViewGraph,
    position: Position,
  ) {
    super(Texture.from(svg));

    this.rightbar = RightBar.getInstance();
    this.id = id;
    this.viewgraph = viewgraph;

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

  sendPacket(packetType: string, destinationId: number): void {
    console.log(
      `Sending ${packetType} packet from ${this.id} to ${destinationId}`,
    );
    const speed = 200; // Velocidad en píxeles por segundo

    const pathEdgeIds = this.viewgraph.getPathBetween(this.id, destinationId);

    if (pathEdgeIds.length === 0) {
      console.warn(
        `No se encontró un camino entre ${this.id} y ${destinationId}.`,
      );
      return;
    }

    const pathEdges = pathEdgeIds.map((id) => this.viewgraph.getEdge(id));

    const packet = new Packet(packetType, speed, this.id, destinationId);
    packet.animateAlongPath(pathEdges, this.id);
  }

  delete(): void {
    this.viewgraph.removeDevice(this.id);
    // Clear connections
    this.connections.clear();
    deselectElement();
  }

  onPointerDown(event: FederatedPointerEvent): void {
    console.log("Entered onPointerDown");
    if (!selectedDeviceId) {
      selectElement(this);
    }
    Device.dragTarget = this;
    event.stopPropagation();

    // Get the pointer position in world (viewport) coordinates
    const worldPosition = this.viewgraph
      .getViewport()
      .toWorld(event.clientX, event.clientY);

    // Calculate the offset between the pointer and the sprite
    this.offsetX = worldPosition.x - this.x;
    this.offsetY = worldPosition.y - this.y;

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

    if (selectedDeviceId) {
      // If the stored ID is the same as this device's, reset it
      if (selectedDeviceId === this.id) {
        return;
      }
      // The "LineStart" device ends up as the end of the drawing but it's the same
      if (this.connectTo(selectedDeviceId)) {
        // selectElement(this.viewgraph.getDevice(selectedDeviceId));
        refreshElement();
        selectedDeviceId = null;
      }
    } else {
      selectElement(this);
    }
  }

  selectToConnect(id: number) {
    if (selectedDeviceId === id) {
      setSelectedDeviceId(null);
    } else {
      setSelectedDeviceId(id);
    }
  }

  highlight() {
    if (!this.highlightMarker) {
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
  }

  removeHighlight() {
    if (this.highlightMarker) {
      this.highlightMarker.clear(); // Clear the graphic
      this.removeChild(this.highlightMarker); // Remove the marker from the viewport
      this.highlightMarker.destroy(); // Destroy the graphic object to free memory
      this.highlightMarker = null;
    }
  }

  addCommonButtons() {
    this.rightbar.addButton(
      "Connect device",
      () => this.selectToConnect(this.id),
      "right-bar-button right-bar-connect-button",
      true,
    );
    this.rightbar.addButton(
      "Delete device",
      () => this.delete(),
      "right-bar-button right-bar-delete-button",
    );

    // Dropdown for selecting packet type
    this.rightbar.addDropdown(
      "Packet Type",
      [
        { value: "IP", text: "IP" },
        { value: "ICMP", text: "ICMP" },
      ],
      "packet-type",
    );

    // Dropdown for selecting destination
    const adjacentDevices = this.viewgraph
      .getDeviceIds()
      .filter((id) => id !== this.id)
      .map((id) => ({ value: id.toString(), text: `Device ${id}` }));

    this.rightbar.addDropdown("Destination", adjacentDevices, "destination");

    // Button to send the packet
    this.rightbar.addButton("Send Packet", () => {
      // Get the selected packet type and destination ID
      const packetType = (
        document.getElementById("packet-type") as HTMLSelectElement
      )?.value;
      const destinationId = Number(
        (document.getElementById("destination") as HTMLSelectElement)?.value,
      );

      // Call the sendPacket method with the selected values
      if (packetType && !isNaN(destinationId)) {
        this.sendPacket(packetType, destinationId);
      } else {
        console.warn("Please select both a packet type and a destination.");
      }
    });
  }

  showInfo() {
    throw new Error("Method not implemented.");
  }

  select() {
    this.highlight(); // Calls highlight on select
    this.showInfo();
  }

  deselect() {
    this.removeHighlight(); // Calls removeHighlight on deselect
    setSelectedDeviceId(null);
  }
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
