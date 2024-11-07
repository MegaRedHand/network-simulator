import { Texture, Sprite, FederatedPointerEvent } from "pixi.js";

import RouterImage from "../assets/router.svg";
import ServerImage from "../assets/server.svg";
import PcImage from "../assets/pc.svg";
import { ViewGraph } from "./graphs/viewgraph";
import { selectElement } from "./viewportManager";

export const DEVICE_SIZE = 20;
let currentLineStartId: number | null = null; // Stores only the ID instead of 'this'

export class Device extends Sprite {
  id: number;
  dragging = false;
  viewgraph: ViewGraph;
  connections = new Map<number, number>();
  offsetX = 0;
  offsetY = 0;

  constructor(
    id: number,
    svg: string,
    viewgraph: ViewGraph,
    position: { x: number; y: number } | null = null,
  ) {
    const texture = Texture.from(svg);
    super(texture);

    this.id = id;
    this.viewgraph = viewgraph;

    this.anchor.x = 0.5;
    this.anchor.y = 0.5;

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

  // Method to update the right-bar with device info
  showInfo() {
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      rightBar.innerHTML = `
            <h3>Device Information</h3>
            <p><strong>ID:</strong> ${this.id}</p>
            <p><strong>Connected Devices:</strong> ${this.connections.size !== 0 ? Array.from(this.connections.values()) : "None"}</p>
        `;
    }
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
    selectElement(this);
    e.stopPropagation();

    if (currentLineStartId) {
      // console.log("LineStart is NOT Null");

      // If the stored ID is the same as this device's, reset it
      if (currentLineStartId === this.id) {
        currentLineStartId = null;
        return;
      }

      // The "LineStart" device ends up as the end of the drawing but it's the same
      if (this.connectTo(currentLineStartId)) {
        currentLineStartId = null;
      }
    }
  }

  select() {
    this.showInfo();
  }

  deselect() {
    // TODO

    console.log("deseleccione");
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
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      rightBar.innerHTML = `
        <h3>Router Information</h3>
        <p><strong>ID:</strong> ${this.id}</p>
        <p><strong>Connected Devices:</strong> ${this.connections.size !== 0 ? "[" + Array.from(this.connections.values()).join(", ") + "]" : "None"}</p>
        <p><strong>Type:</strong> Router</p>
        <button id="connect-device">Connect device</button>
        <button id="delete-device">Delete device</button>
      `;

      // Add event to the connect button
      const connectButton = document.getElementById("connect-device");
      connectButton?.addEventListener(
        "click",
        () => (currentLineStartId = this.id),
      ); //this.connectDevice());

      // Add event to the delete button
      const deleteButton = document.getElementById("delete-device");
      deleteButton?.addEventListener("click", () => this.deleteDevice());
    }
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
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      rightBar.innerHTML = `
        <h3>Server Information</h3>
        <p><strong>ID:</strong> ${this.id}</p>
        <p><strong>Connected Devices:</strong> ${this.connections.size !== 0 ? "[" + Array.from(this.connections.values()).join(", ") + "]" : "None"}</p>
        <p><strong>Type:</strong> Server</p>
        <button id="connect-device">Connect device</button>
        <button id="delete-device">Delete device</button>
      `;

      // Add event to the connect button
      const connectButton = document.getElementById("connect-device");
      connectButton?.addEventListener(
        "click",
        () => (currentLineStartId = this.id),
      );

      // Add event to the delete button
      const deleteButton = document.getElementById("delete-device");
      deleteButton?.addEventListener("click", () => this.deleteDevice());
    }
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
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      rightBar.innerHTML = `
        <h3>PC Information</h3>
        <p><strong>ID:</strong> ${this.id}</p>
        <p><strong>Connected Devices:</strong> ${this.connections.size !== 0 ? "[" + Array.from(this.connections.values()).join(", ") + "]" : "None"}</p>
        <p><strong>Type:</strong> PC</p>
        <button id="connect-device">Connect device</button>
        <button id="delete-device">Delete device</button>
      `;

      // Add event to the connect button
      const connectButton = document.getElementById("connect-device");
      connectButton?.addEventListener(
        "click",
        () => (currentLineStartId = this.id),
      );

      // Add event to the delete button
      const deleteButton = document.getElementById("delete-device");
      deleteButton?.addEventListener("click", () => this.deleteDevice());
    }
  }
}
