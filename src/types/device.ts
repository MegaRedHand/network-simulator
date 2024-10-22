import { Texture, Graphics, Sprite, FederatedPointerEvent } from "pixi.js";

import RouterImage from "../assets/router.svg";
import ServerImage from "../assets/server.svg";
import PcImage from "../assets/pc.svg";
import { NetworkGraph } from "./networkgraph";
import { Edge } from "./edge";

export const DEVICE_SIZE = 20;
var lineStart: { device: Device; sprite: Sprite } = null;

export class Device {
  id: number;
  dragging: boolean = false;
  fatherGraph: NetworkGraph;
  connections: Map<number, Edge> = new Map();
  offsetX: number = 0;
  offsetY: number = 0;

  private static idCounter: number = 0;

  constructor(device: string | Texture, graph: NetworkGraph) {
    this.fatherGraph = graph;
    this.id = Device.idCounter++;

    const sprite = Sprite.from(device);
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;

    sprite.eventMode = "static";
    sprite.interactive = true;

    sprite.on("pointerdown", this.onPointerDown, this);
    sprite.on("click", this.onClick, this);
  }

  resize(sprite: Sprite): void {
    // Setup the size of the new element
    sprite.width = sprite.width / 70;
    sprite.height = sprite.height / DEVICE_SIZE;
  }

  onPointerDown(event: FederatedPointerEvent): void {
    this.dragging = true;

    const sprite = event.currentTarget as Sprite;
    // Calcula el desplazamiento entre el mouse y el elemento
    this.offsetX = event.clientX - sprite.x;
    this.offsetY = event.clientY - sprite.y;

    // Escucha los eventos globales de pointermove y pointerup
    document.addEventListener("pointermove", this.onPointerMove);
    document.addEventListener("pointerup", this.onPointerUp);
  }

  onPointerMove = (event: PointerEvent): void => {
    const sprite = event.currentTarget as Sprite;
    if (this.dragging) {
      // Calcula la nueva posición usando el desplazamiento
      const newPositionX = event.clientX - this.offsetX;
      const newPositionY = event.clientY - this.offsetY;
      sprite.x = newPositionX;
      sprite.y = newPositionY;

      // Actualiza las líneas conectadas
      this.updateLines(sprite.x, sprite.y);
    }
  };

  onPointerUp = (): void => {
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

    // this.stage.addChild(edge);

    // Save the edge in both devices
    const n1Info = { id: this.id, x: x1, y: y1 };
    const n2Info = { id: otherDevice.id, x: x2, y: y2 };
    const edge = this.fatherGraph.addEdge(n1Info, n2Info);
    if (edge) {
      this.connections.set(edge.id, edge);
      otherDevice.connections.set(edge.id, edge);
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
    console.log("clicked on device", e);
    if (!e.altKey) {
      return;
    }
    e.stopPropagation();
    const sprite = e.currentTarget as Sprite;
    if (lineStart === null) {
      lineStart = { device: this, sprite };
    } else {
      if (
        lineStart.device.connectTo(
          this,
          lineStart.sprite.x,
          lineStart.sprite.y,
          sprite.x,
          sprite.y
        )
      ) {
        lineStart = null;
      }
    }
  }
}

export class Router extends Device {
  constructor(graph: NetworkGraph) {
    super(RouterImage, graph);
  }
}

export class Server extends Device {
  constructor(graph: NetworkGraph) {
    super(ServerImage, graph);
  }
}

export class Pc extends Device {
  constructor(graph: NetworkGraph) {
    super(PcImage, graph);
  }
}
