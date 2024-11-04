import { Texture, Sprite, FederatedPointerEvent } from "pixi.js";

import RouterImage from "../assets/router.svg";
import ServerImage from "../assets/server.svg";
import PcImage from "../assets/pc.svg";
import { ViewGraph } from "./graphs/viewgraph";

export const DEVICE_SIZE = 20;
let currentLineStartId: number | null = null; // Almacena solo el ID en lugar de 'this'

export class Device extends Sprite {
  id: number;
  dragging = false;
  viewgraph: ViewGraph;
  connections = new Map<number, number>();
  offsetX = 0;
  offsetY = 0;

  constructor(
    id: number,
    device: string,
    viewgraph: ViewGraph,
    position: { x: number; y: number } | null = null,
  ) {
    // console.log("Entro a constructor de Device");
    const texture = Texture.from(device);
    super(texture);

    this.id = id;
    this.viewgraph = viewgraph;

    // console.log(this.texture);
    this.anchor.x = 0.5;
    this.anchor.y = 0.5;

    // console.log(`la position es: ${position.x} y ${position.y}`);

    // Usar las coordenadas especificadas o el centro del mundo
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

    this.eventMode = "static";
    this.interactive = true;

    stage.addChild(this);

    this.on("pointerdown", this.onPointerDown, this);
    this.on("click", this.onClick, this);

    // this.viewgraph.logGraphData();
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

  // Método para actualizar la right-bar con info del device
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
    // Limpiar conexiones
    this.connections.clear();
    this.viewgraph.logGraphData();
  }

  onPointerDown(event: FederatedPointerEvent): void {
    // console.log("Entro al onPointerDown");
    this.dragging = true;
    event.stopPropagation();

    // Obtén la posición del puntero en coordenadas del mundo (viewport)
    const worldPosition = this.viewgraph
      .getViewport()
      .toWorld(event.clientX, event.clientY);

    // Calcula el desplazamiento entre el puntero y el sprite
    this.offsetX = worldPosition.x - this.x;
    this.offsetY = worldPosition.y - this.y;

    // Escucha los eventos globales de pointermove y pointerup
    document.addEventListener("pointermove", this.onPointerMove);
    document.addEventListener("pointerup", this.onPointerUp);
  }

  onPointerMove = (event: FederatedPointerEvent): void => {
    // console.log("Entro al onPointerMove");
    if (this.dragging) {
      // Obtén la nueva posición del puntero en coordenadas del mundo
      const worldPosition = this.viewgraph
        .getViewport()
        .toWorld(event.clientX, event.clientY);

      // Calcula la nueva posición del sprite usando el desplazamiento calculado
      const newPositionX = worldPosition.x - this.offsetX;
      const newPositionY = worldPosition.y - this.offsetY;

      // Actualiza la posición del sprite
      this.x = newPositionX;
      this.y = newPositionY;

      // Notify view graph about it movement
      this.viewgraph.deviceMoved(this.id);
    }
  };

  onPointerUp = (): void => {
    // console.log("Entro al onPointerUp");
    this.dragging = false;
    // Remueve los eventos globales de pointermove y pointerup
    document.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerup", this.onPointerUp);
  };

  connectTo(adyacentId: number): boolean {
    // Connnects both devices with an edge.
    // console.log("entro en connectTo");

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
    if (!e.altKey) {
      this.showInfo();
      e.stopPropagation();
      return;
    }

    // console.log("clicked on device", e);
    e.stopPropagation();

    if (currentLineStartId === null) {
      // console.log("El LineStart es Null");
      currentLineStartId = this.id; // Solo almacenamos el ID del dispositivo
    } else {
      // console.log("El LineStart NO es Null");

      // Si el ID almacenado es el mismo que el de este dispositivo, lo reseteamos
      if (currentLineStartId === this.id) {
        currentLineStartId = null;
        return;
      }

      // El dispositivo "LineStart" termina siendo el final del dibujo pero es lo mismo
      if (this.connectTo(currentLineStartId)) {
        currentLineStartId = null;
      }
    }
  }
}

export class Router extends Device {
  constructor(
    id: number,
    viewgraph: ViewGraph,
    position: { x: number; y: number },
  ) {
    console.log("Entro a constructor de Router");
    super(id, RouterImage, viewgraph, position);
  }

  showInfo() {
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      rightBar.innerHTML = `
        <h3>Router Information</h3>
        <p><strong>ID:</strong> ${this.id}</p>
        <p><strong>Dispositivos Conectados:</strong> ${this.connections.size !== 0 ? Array.from(this.connections.values()) : "Ninguno"}</p>
        <p><strong>Type:</strong> Router</p>
        <button id="delete-device">Eliminar dispositivo</button>
      `;

      // Añadir el evento al botón de eliminar
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
    console.log("Entro a constructor de Server");
    super(id, ServerImage, viewgraph, position);
  }

  showInfo() {
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      rightBar.innerHTML = `
        <h3>Server Information</h3>
        <p><strong>ID:</strong> ${this.id}</p>
        <p><strong>Dispositivos Conectados:</strong> ${this.connections.size !== 0 ? Array.from(this.connections.values()) : "Ninguno"}</p>
        <p><strong>Type:</strong> Server</p>
        <button id="delete-device">Eliminar dispositivo</button>
      `;

      // Añadir el evento al botón de eliminar
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
    console.log("Entro a constructor de Pc");
    super(id, PcImage, viewgraph, position);
  }

  showInfo() {
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      rightBar.innerHTML = `
        <h3>PC Information</h3>
        <p><strong>ID:</strong> ${this.id}</p>
        <p><strong>Dispositivos Conectados:</strong> ${this.connections.size !== 0 ? Array.from(this.connections.values()) : "Ninguno"}</p>
        <p><strong>Type:</strong> PC</p>
        <button id="delete-device">Eliminar dispositivo</button>
      `;

      // Añadir el evento al botón de eliminar
      const deleteButton = document.getElementById("delete-device");
      deleteButton?.addEventListener("click", () => this.deleteDevice());
    }
  }
}
