import { Texture, Sprite, FederatedPointerEvent } from "pixi.js";
import RouterImage from "../assets/router.svg";
import ServerImage from "../assets/server.svg";
import PcImage from "../assets/pc.svg";
import { ViewGraph } from "./graphs/viewgraph";
import { selectElement } from "./viewportManager";
import { RightBar } from "../index"

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

  constructor(
    id: number,
    svg: string,
    viewgraph: ViewGraph,
    position: { x: number; y: number } | null = null,
  ) {

    const texture = Texture.from(svg);
    super(texture);
    
    this.rightbar = RightBar.getFrom(document);
    this.id = id;
    this.viewgraph = viewgraph;

    this.anchor.x = 0.5;
    this.anchor.y = 0.5;

    this.cursor = "pointer";

    // Use specified coordinates or the center of the world
    const stage = this.viewgraph.getViewport();
    if (position) {
      this.x = position.x;
      this.y = position.y;
    } else {
      const worldCenter = stage.toWorld(
        stage.screenWidth / 2,
        stage.screenHeight / 2,
      );
      this.x = worldCenter.x;
      this.y = worldCenter.y;
    }

    this.on("pointerdown", this.onPointerDown, this);
    this.on("click", this.onClick, this);
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
    // Setup the size of the new element
    sprite.width = sprite.width / 70;
    sprite.height = sprite.height / DEVICE_SIZE;
  }

  deleteDevice(): void {
    this.viewgraph.removeDevice(this.id);
    // Clear connections
    this.connections.clear();
    this.viewgraph.logGraphData();
  }

  onPointerDown(event: FederatedPointerEvent): void {
    // console.log("Entered onPointerDown");
    this.dragging = true;
    event.stopPropagation();

    // Get the pointer position in world (viewport) coordinates
    const worldPosition = this.viewgraph
      .getViewport()
      .toWorld(event.clientX, event.clientY);

    // Calculate the offset between the pointer and the sprite
    this.offsetX = worldPosition.x - this.x;
    this.offsetY = worldPosition.y - this.y;

    // Listen to global pointermove and pointerup events
    document.addEventListener("pointermove", this.onPointerMove.bind(this));
    document.addEventListener("pointerup", this.onPointerUp.bind(this));
  }

  onPointerMove(event: FederatedPointerEvent): void {
    // console.log("Entered onPointerMove");
    if (this.dragging) {

      // Get the new pointer position in world coordinates
      const worldPosition = this.viewgraph
        .getViewport()
        .toWorld(event.clientX, event.clientY);

      // Calculate the new sprite position using the calculated offset
      const newPositionX = worldPosition.x - this.offsetX;
      const newPositionY = worldPosition.y - this.offsetY;

      // Update the sprite position
      this.x = newPositionX;
      this.y = newPositionY;

      // Notify view graph about its movement
      this.viewgraph.deviceMoved(this.id);
    }
  }

  onPointerUp(): void {
    // console.log("Entered onPointerUp");
    this.dragging = false;
    // Remove global pointermove and pointerup events
    document.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerup", this.onPointerUp);
  }

  connectTo(adyacentId: number): boolean {
    // Connects both devices with an edge.
    // console.log("Entered connectTo");

    const edgeId = this.viewgraph.addEdge(this.id, adyacentId);
    if (edgeId) {
      const adyacentDevice = this.viewgraph.getDevice(adyacentId);
      this.addConnection(edgeId, adyacentId);
      adyacentDevice.addConnection(edgeId, this.id);
      this.viewgraph.logGraphData();
      return true;
    }
    return false;
  }

  onClick(e: FederatedPointerEvent) {
    e.stopPropagation();

    if (selectedDeviceId) {
      // console.log("LineStart is NOT Null");

      // If the stored ID is the same as this device's, reset it
      if (selectedDeviceId === this.id) {
        selectedDeviceId = null;
        return;
      }

      // The "LineStart" device ends up as the end of the drawing but it's the same
      if (this.connectTo(selectedDeviceId)) {
        selectedDeviceId = null;
      }
    }
    selectElement(this);
  }

  showInfo() {
    throw new Error("Method not implemented.");
  }

  select() {
    // Aplica el filtro de contorno
    this.showInfo();
  }

  deselect() {
    // TODO
  }

}

export class Router extends Device {
  constructor(
    id: number,
    viewgraph: ViewGraph,
    position: { x: number; y: number },
  ) {
    console.log("Entered Router constructor");
    super(id, RouterImage, viewgraph, position);
  }

  showInfo() {
    // Muestra la información específica del Router
    this.rightbar.renderInfo("Router Information", [
      { label: "ID", value: this.id.toString() },
      { label: "Connected Devices", value: this.connections.size !== 0 ? "[" + Array.from(this.connections.values()).join(", ") + "]" : "None" },
      { label: "Model", value: "TP-Link AX6000" },
      { label: "IP Address", value: "192.168.1.1" },
      { label: "Firmware Version", value: "1.2.3" },
      { label: "Uptime", value: "5 days, 4 hours, 23 minutes" }
    ]);

    // Agrega los botones comunes y específicos del Router
    this.rightbar.addButton("Connect device", () => setSelectedDeviceId(this.id), "right-bar-button", true);
    this.rightbar.addButton("Delete device", () => this.deleteDevice());
    this.rightbar.addButton("Reboot Router", () => this.rebootRouter());
  }

  rebootRouter() {
    console.log("Rebooting router...");
  }
}

export class Server extends Device {
  constructor(
    id: number,
    viewgraph: ViewGraph,
    position: { x: number; y: number },
  ) {
    console.log("Entered Server constructor");
    super(id, ServerImage, viewgraph, position);
  }

  showInfo() {
    // Muestra la información específica del Server
    this.rightbar.renderInfo("Server Information", [
      { label: "ID", value: this.id.toString() },
      { label: "Connected Devices", value: this.connections.size !== 0 ? "[" + Array.from(this.connections.values()).join(", ") + "]" : "None" },
      { label: "Operating System", value: "Ubuntu 20.04 LTS" },
      { label: "CPU Usage", value: "42%" },
      { label: "Memory Usage", value: "8 GB / 16 GB" },
      { label: "Disk Space", value: "500 GB / 1 TB" },
      { label: "Last Backup", value: "2024-11-01 02:30 AM" }
    ]);

    // Agrega los botones comunes y específicos del Server
    this.rightbar.addButton("Connect device", () => setSelectedDeviceId(this.id), "right-bar-button", true);
    this.rightbar.addButton("Delete device", () => this.deleteDevice());
    this.rightbar.addButton("Shutdown Server", () => this.shutdownServer());
    this.rightbar.addButton("Start Server", () => this.startServer());
  }


  shutdownServer() {
    console.log("Shutting down server...");
    this.tint = 0xFF0000; // Cambia el color del sprite a rojo
  }

  startServer() {
    console.log("Starting server...");
    this.tint = 0x00FF00; // Cambia el color del sprite a verde
  }
}

export class Pc extends Device {
  constructor(
    id: number,
    viewgraph: ViewGraph,
    position: { x: number; y: number },
  ) {
    console.log("Entered Pc constructor");
    super(id, PcImage, viewgraph, position);
  }

  showInfo() {
    // Muestra la información específica del PC
    this.rightbar.renderInfo("PC Information", [
      { label: "ID", value: this.id.toString() },
      { label: "Connected Devices", value: this.connections.size !== 0 ? "[" + Array.from(this.connections.values()).join(", ") + "]" : "None" },
      { label: "Operating System", value: "Windows 10 Pro" },
      { label: "Antivirus Status", value: "Active" },
      { label: "IP Address", value: "192.168.1.100" },
      { label: "Storage Available", value: "250 GB / 512 GB" }
    ]);

    // Agrega los botones comunes y específicos del PC
    this.rightbar.addButton("Connect device", () => setSelectedDeviceId(this.id), "right-bar-button", true);
    this.rightbar.addButton("Delete device", () => this.deleteDevice());
    this.rightbar.addButton("Run Virus Scan", () => this.runVirusScan());
  }

  runVirusScan() {
    console.log("Running virus scan on PC...");
  }
}
