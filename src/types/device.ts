import { Texture, Sprite, FederatedPointerEvent } from "pixi.js";

import RouterImage from "../assets/router.svg";
import ServerImage from "../assets/server.svg";
import PcImage from "../assets/pc.svg";
import { ViewGraph } from "./viewgraph";
import { Edge } from "./edge";
import { Viewport } from "..";

export const DEVICE_SIZE = 20;
let currentLineStartId: number | null = null; // Almacena solo el ID en lugar de 'this'

export class Device {
  id: number;
  dragging = false;
  sprite: Sprite;
  fatherGraph: ViewGraph;
  stage: Viewport;
  connections = new Map<number, Edge>();
  offsetX = 0;
  offsetY = 0;

  constructor(
    id: number,
    device: string,
    graph: ViewGraph,
    stage: Viewport,
    position: { x: number; y: number } | null = null,
  ) {
    console.log("Entro a constructor de Device");
    this.id = id;
    this.fatherGraph = graph;

    const texture = Texture.from(device);
    const sprite = Sprite.from(texture);
    console.log(sprite.texture);
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    console.log(sprite.zIndex);

    // Obtener las coordenadas centrales del mundo después del zoom
    if (!position) {
      const worldCenter = stage.toWorld(
        stage.screenWidth / 2,
        stage.screenHeight / 2,
      );

      sprite.x = worldCenter.x;
      sprite.y = worldCenter.y;
    } else {
      sprite.x = position.x;
      sprite.y = position.y;
    }

    sprite.eventMode = "static";
    sprite.interactive = true;

    stage.addChild(sprite);

    sprite.on("pointerdown", this.onPointerDown, this);
    sprite.on("click", this.onClick, this);

    this.sprite = sprite;
    this.stage = stage;
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
      // Recorremos las conexiones para extraer los IDs de los dispositivos conectados
      const connectedDeviceIds = Array.from(this.connections.values())
        .map((edge) =>
          edge.connectedNodes.n1 === this.id
            ? edge.connectedNodes.n2
            : edge.connectedNodes.n1,
        )
        .join(", ");

      rightBar.innerHTML = `
            <h3>Device Information</h3>
            <p><strong>ID:</strong> ${this.id}</p>
            <p><strong>Connected Devices:</strong> ${connectedDeviceIds ? connectedDeviceIds : "None"}</p>
        `;
    }
  }

  onPointerDown(event: FederatedPointerEvent): void {
    console.log("Entro al onPointerDown");
    this.dragging = true;
    event.stopPropagation();

    // Obtén la posición del puntero en coordenadas del mundo (viewport)
    const worldPosition = this.stage.toWorld(event.clientX, event.clientY);

    // Calcula el desplazamiento entre el puntero y el sprite
    this.offsetX = worldPosition.x - this.sprite.x;
    this.offsetY = worldPosition.y - this.sprite.y;

    // Escucha los eventos globales de pointermove y pointerup
    document.addEventListener("pointermove", this.onPointerMove);
    document.addEventListener("pointerup", this.onPointerUp);
  }

  onPointerMove = (event: FederatedPointerEvent): void => {
    console.log("Entro al onPointerMove");
    if (this.dragging) {
      // Obtén la nueva posición del puntero en coordenadas del mundo
      const worldPosition = this.stage.toWorld(event.clientX, event.clientY);

      // Calcula la nueva posición del sprite usando el desplazamiento calculado
      const newPositionX = worldPosition.x - this.offsetX;
      const newPositionY = worldPosition.y - this.offsetY;

      // Actualiza la posición del sprite
      this.sprite.x = newPositionX;
      this.sprite.y = newPositionY;

      // Actualiza las líneas conectadas
      this.updateLines();
    }
  };

  onPointerUp = (): void => {
    console.log("Entro al onPointerUp");
    this.dragging = false;
    // Remueve los eventos globales de pointermove y pointerup
    document.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerup", this.onPointerUp);
  };

  connectTo(
    otherDevice: Device,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): boolean {
    // Connnects both devices with an edge.
    console.log("entro en connecTo");

    // Save the edge in both devices
    const n1Info = { id: this.id, x: x1, y: y1 };
    const n2Info = { id: otherDevice.id, x: x2, y: y2 };
    const edge = this.fatherGraph.addEdge(n1Info, n2Info);
    if (edge) {
      this.connections.set(edge.id, edge);
      otherDevice.connections.set(edge.id, edge);
      this.stage.addChild(edge);
      return true;
    }
    return false;
  }

  updateLines(): void {
    // Updates the positions of the device-linked lines’ ends.
    this.connections.forEach((edge) => {
      console.log("pasa por una linea");

      // Obtener los dispositivos de inicio y fin directamente
      const startDevice =
        edge.connectedNodes.n1 === this.id
          ? this
          : this.fatherGraph.getDevice(edge.connectedNodes.n1);

      const endDevice =
        edge.connectedNodes.n1 === this.id
          ? this.fatherGraph.getDevice(edge.connectedNodes.n2)
          : this;

      if (startDevice && endDevice) {
        const dx = endDevice.sprite.x - startDevice.sprite.x;
        const dy = endDevice.sprite.y - startDevice.sprite.y;
        const angle = Math.atan2(dy, dx);

        // Ajustar el punto de inicio y fin para que estén en el borde del ícono
        const offsetX = (startDevice.sprite.width / 2) * Math.cos(angle);
        const offsetY = (startDevice.sprite.height / 2) * Math.sin(angle);

        // Redibuja la línea
        edge.clear();
        edge.moveTo(
          startDevice.sprite.x + offsetX,
          startDevice.sprite.y + offsetY,
        );
        edge.lineTo(endDevice.sprite.x - offsetX, endDevice.sprite.y - offsetY);
        edge.stroke({ width: 2, color: 0x3e3e3e }); // Redraw the line
      }
    });
  }

  onClick(e: FederatedPointerEvent) {
    if (!e.altKey) {
      this.showInfo();
      e.stopPropagation();
      return;
    }

    console.log("clicked on device", e);
    e.stopPropagation();

    if (currentLineStartId === null) {
      console.log("El LineStart es Null");
      currentLineStartId = this.id; // Solo almacenamos el ID del dispositivo
    } else {
      console.log("El LineStart NO es Null");

      // Si el ID almacenado es el mismo que el de este dispositivo, lo reseteamos
      if (currentLineStartId === this.id) {
        currentLineStartId = null;
        return;
      }

      const startDevice = this.fatherGraph.getDevice(currentLineStartId); // Usamos el ID para obtener el dispositivo original

      if (
        startDevice &&
        startDevice.connectTo(
          this,
          startDevice.sprite.x,
          startDevice.sprite.y,
          this.sprite.x,
          this.sprite.y,
        )
      ) {
        currentLineStartId = null;
      }
    }
  }

  // "Clean up" device’s resources.
  // Warning: after calling this method, object must not be used.
  private clean() {
    this.stage.removeChild(this.sprite);
    this.sprite.destroy({ children: true, texture: true });
  }
}

export class Router extends Device {
  constructor(
    id: number,
    graph: ViewGraph,
    stage: Viewport,
    position: { x: number; y: number },
  ) {
    console.log("Entro a constructor de Router");
    super(id, RouterImage, graph, stage, position);
  }

  showInfo() {
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      const connectedDeviceIds = Array.from(this.connections.values())
        .map((edge) =>
          edge.connectedNodes.n1 === this.id
            ? edge.connectedNodes.n2
            : edge.connectedNodes.n1,
        )
        .join(", ");

      rightBar.innerHTML = `
        <h3>Router Information</h3>
        <p><strong>ID:</strong> ${this.id}</p>
        <p><strong>Connected Devices:</strong> ${connectedDeviceIds ? connectedDeviceIds : "None"}</p>
        <p><strong>Type:</strong> Router</p>
      `;
    }
  }
}

export class Server extends Device {
  constructor(
    id: number,
    graph: ViewGraph,
    stage: Viewport,
    position: { x: number; y: number },
  ) {
    super(id, ServerImage, graph, stage, position);
  }

  showInfo() {
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      const connectedDeviceIds = Array.from(this.connections.values())
        .map((edge) =>
          edge.connectedNodes.n1 === this.id
            ? edge.connectedNodes.n2
            : edge.connectedNodes.n1,
        )
        .join(", ");

      rightBar.innerHTML = `
        <h3>Server Information</h3>
        <p><strong>ID:</strong> ${this.id}</p>
        <p><strong>Connected Devices:</strong> ${connectedDeviceIds ? connectedDeviceIds : "None"}</p>
        <p><strong>Type:</strong> Server</p>
      `;
    }
  }
}

export class Pc extends Device {
  constructor(
    id: number,
    graph: ViewGraph,
    stage: Viewport,
    position: { x: number; y: number },
  ) {
    super(id, PcImage, graph, stage, position);
  }

  showInfo() {
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      const connectedDeviceIds = Array.from(this.connections.values())
        .map((edge) =>
          edge.connectedNodes.n1 === this.id
            ? edge.connectedNodes.n2
            : edge.connectedNodes.n1,
        )
        .join(", ");

      rightBar.innerHTML = `
        <h3>PC Information</h3>
        <p><strong>ID:</strong> ${this.id}</p>
        <p><strong>Connected Devices:</strong> ${connectedDeviceIds ? connectedDeviceIds : "None"}</p>
        <p><strong>Type:</strong> PC</p>
      `;
    }
  }
}
