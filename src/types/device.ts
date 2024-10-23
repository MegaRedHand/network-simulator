import { Texture, Sprite, FederatedPointerEvent } from "pixi.js";

import RouterImage from "../assets/router.svg";
import ServerImage from "../assets/server.svg";
import PcImage from "../assets/pc.svg";
import { NetworkGraph } from "./networkgraph";
import { Edge } from "./edge";
import { Viewport } from "..";

export const DEVICE_SIZE = 20;
var lineStart: Device = null;

export class Device {
  id: number;
  dragging: boolean = false;
  sprite: Sprite;
  fatherGraph: NetworkGraph;
  stage: Viewport;
  connections: Map<number, Edge> = new Map();
  offsetX: number = 0;
  offsetY: number = 0;

  private static idCounter: number = 0;

  constructor(device: string, graph: NetworkGraph, stage: Viewport) {
    console.log("Entro a constructor de Device");
    this.fatherGraph = graph;
    this.id = Device.idCounter++;

    const texture = Texture.from(device);
    const sprite = Sprite.from(texture);
    console.log(sprite.texture);
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    console.log(sprite.zIndex);

    // Obtener las coordenadas centrales del mundo después del zoom
    const worldCenter = stage.toWorld(
      stage.screenWidth / 2,
      stage.screenHeight / 2
    );

    sprite.x = worldCenter.x;
    sprite.y = worldCenter.y;

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
            .map(edge => edge.connectedNodes.n1 === this.id ? edge.connectedNodes.n2 : edge.connectedNodes.n1)
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
      this.updateLines(newPositionX, newPositionY);
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
    y2: number
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

  updateLines(x: number, y: number): void {
    // Updates the positions of the device-linked
    // lines’s ends.
    this.connections.forEach((edge) => {
      console.log("pasa por una linea");
      if (edge.connectedNodes.n1 === this.id) {
        edge.startPos = { x: x, y: y };
      } else {
        edge.endPos = { x: x, y: y };
      }
      edge.clear();
      edge.moveTo(edge.startPos.x, edge.startPos.y);
      edge.lineTo(edge.endPos.x, edge.endPos.y);
      edge.stroke({ width: 2, color: 0x3e3e3e }); // Redraw the line
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
    if (lineStart === null) {
      console.log("El LineStart es Null");
      lineStart = this;
    } else {
      console.log("El LineStart NO es Null");
      if (
        lineStart.connectTo(
          this,
          lineStart.sprite.x,
          lineStart.sprite.y,
          this.sprite.x,
          this.sprite.y
        )
      ) {
        lineStart = null;
      }
    }
  }
}

export class Router extends Device {
  constructor(graph: NetworkGraph, stage: Viewport) {
    console.log("Entro a constructor de Router");
    super(RouterImage, graph, stage);
  }

  showInfo() {
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      const connectedDeviceIds = Array.from(this.connections.values())
        .map(edge => edge.connectedNodes.n1 === this.id ? edge.connectedNodes.n2 : edge.connectedNodes.n1)
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
  constructor(graph: NetworkGraph, stage: Viewport) {
    super(ServerImage, graph, stage);
  }

  showInfo() {
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      const connectedDeviceIds = Array.from(this.connections.values())
        .map(edge => edge.connectedNodes.n1 === this.id ? edge.connectedNodes.n2 : edge.connectedNodes.n1)
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
  constructor(graph: NetworkGraph, stage: Viewport) {
    super(PcImage, graph, stage);
  }

  showInfo() {
    const rightBar = document.getElementById("info-content");
    if (rightBar) {
      const connectedDeviceIds = Array.from(this.connections.values())
        .map(edge => edge.connectedNodes.n1 === this.id ? edge.connectedNodes.n2 : edge.connectedNodes.n1)
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

