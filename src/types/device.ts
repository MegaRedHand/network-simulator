import { Texture, Sprite, FederatedPointerEvent } from "pixi.js";

import RouterImage from "../assets/router.svg";
import ServerImage from "../assets/server.svg";
import PcImage from "../assets/pc.svg";
import { NetworkGraph } from "./networkgraph";
import { Packet } from "./packet";
import { Edge } from "./edge";
import { Viewport } from "..";

export const DEVICE_SIZE = 20;
let currentLineStartId: number | null = null;

export class Device {
  id: number;
  dragging = false;
  sprite: Sprite;
  fatherGraph: NetworkGraph;
  stage: Viewport;
  connections = new Map<number, Edge>();
  offsetX = 0;
  offsetY = 0;

  private static idCounter = 0;

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

    const worldCenter = stage.toWorld(
      stage.screenWidth / 2,
      stage.screenHeight / 2,
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
    sprite.width = sprite.width / 70;
    sprite.height = sprite.height / DEVICE_SIZE;
  }

  sendPacket(packetType: string, destinationId: number): void {
    console.log(`Sending ${packetType} packet from ${this.id} to ${destinationId}`);

    const packetColors: Record<string, number> = {
        'IP': 0x00FF00,  // Verde para paquetes IP
        'ICMP': 0xFF0000  // Rojo para paquetes ICMP
    };

    const color = packetColors[packetType] || 0xFFFFFF; // Color por defecto blanco
    const speed = 200; // Velocidad en píxeles por segundo

    const destinationDevice = this.fatherGraph.getDevice(destinationId);
    if (destinationDevice) {
        const edge = this.fatherGraph.getEdge(this.id, destinationId);
        if (edge) {
            const packet = new Packet(color, speed);
            this.stage.addChild(packet.sprite); // Añadir el paquete al escenario
            packet.animateAlongEdge(edge,destinationDevice.id); // Animar el paquete a lo largo de la arista
        } else {
            console.warn(`No se encontró una arista entre ${this.id} y ${destinationId}.`);
        }
    } else {
        console.warn(`Dispositivo de destino con ID ${destinationId} no encontrado.`);
    }
}

  // Método general para mostrar la información del dispositivo
  showInfo(extraInfo = "") {
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
        <h3>${this.constructor.name} Information</h3>
        <p><strong>ID:</strong> ${this.id}</p>
        <p><strong>Connected Devices:</strong> ${connectedDeviceIds ? connectedDeviceIds : "None"}</p>
        ${extraInfo}
      `;
    }
  }
  
  // Método para manejar la información específica de envío de paquetes
  showPacketInfo() {
    const adjacentDevices = Array.from(this.connections.values()).map(edge =>
      edge.connectedNodes.n1 === this.id ? edge.connectedNodes.n2 : edge.connectedNodes.n1
    );

    const destinationOptions = adjacentDevices.map(id => `<option value="${id}">${id}</option>`).join("");

    // Agrega un evento al botón para manejar el envío del paquete
    const sendPacketButtonId = "sendPacketButton";

    const htmlContent = `
      <h3>Send Packet</h3>
      <label for="packetType">Select Packet Type:</label>
      <select id="packetType">
        <option value="IP">IP</option>
        <option value="ICMP">ICMP</option>
      </select>
      <label for="destination">Select Destination:</label>
      <select id="destination">
        ${destinationOptions}
      </select>
      <button id="${sendPacketButtonId}">Send Packet</button>
    `;

  // Asigna el listener al botón
  setTimeout(() => {
    const button = document.getElementById(sendPacketButtonId);
    if (button) {
      button.addEventListener("click", () => {
        const packetType = (document.getElementById("packetType") as HTMLSelectElement).value;
        const destinationId = parseInt((document.getElementById("destination") as HTMLSelectElement).value, 10);
        this.sendPacket(packetType, destinationId);
      });
    }
  }, 0); // Delay para asegurar que el HTML esté en el DOM

  return htmlContent;
}


  onPointerDown(event: FederatedPointerEvent): void {
    console.log("Entro al onPointerDown");
    this.dragging = true;
    event.stopPropagation();

    const worldPosition = this.stage.toWorld(event.clientX, event.clientY);
    this.offsetX = worldPosition.x - this.sprite.x;
    this.offsetY = worldPosition.y - this.sprite.y;

    document.addEventListener("pointermove", this.onPointerMove);
    document.addEventListener("pointerup", this.onPointerUp);
  }

  onPointerMove = (event: FederatedPointerEvent): void => {
    console.log("Entro al onPointerMove");
    if (this.dragging) {
      const worldPosition = this.stage.toWorld(event.clientX, event.clientY);
      const newPositionX = worldPosition.x - this.offsetX;
      const newPositionY = worldPosition.y - this.offsetY;

      this.sprite.x = newPositionX;
      this.sprite.y = newPositionY;

      this.updateLines();
      this.fatherGraph.updateEdges();
    }
  };

  onPointerUp = (): void => {
    console.log("Entro al onPointerUp");
    this.dragging = false;
    document.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerup", this.onPointerUp);
  };

  connectTo(otherDevice: Device, x1: number, y1: number, x2: number, y2: number): boolean {
    console.log("entro en connectTo");

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
    this.connections.forEach((edge) => {
      console.log("pasa por una linea");

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

        const offsetX = (startDevice.sprite.width / 2) * Math.cos(angle);
        const offsetY = (startDevice.sprite.height / 2) * Math.sin(angle);

        edge.clear();
        edge.moveTo(
          startDevice.sprite.x + offsetX,
          startDevice.sprite.y + offsetY,
        );
        edge.lineTo(endDevice.sprite.x - offsetX, endDevice.sprite.y - offsetY);
        edge.stroke({ width: 2, color: 0x3e3e3e });
      }
    });
  }

  onClick(e: FederatedPointerEvent) {
    if (!e.altKey) {
      this.showInfo(this.showPacketInfo());
      e.stopPropagation();
      return;
    }

    console.log("clicked on device", e);
    e.stopPropagation();

    if (currentLineStartId === null) {
      console.log("El LineStart es Null");
      currentLineStartId = this.id;
    } else {
      console.log("El LineStart NO es Null");

      if (currentLineStartId === this.id) {
        currentLineStartId = null;
        return;
      }

      const startDevice = this.fatherGraph.getDevice(currentLineStartId);

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
}

export class Router extends Device {
  constructor(graph: NetworkGraph, stage: Viewport) {
    console.log("Entro a constructor de Router");
    super(RouterImage, graph, stage);
  }
}

export class Server extends Device {
  constructor(graph: NetworkGraph, stage: Viewport) {
    console.log("Entro a constructor de Server");
    super(ServerImage, graph, stage);
  }
}

export class Pc extends Device {
  constructor(graph: NetworkGraph, stage: Viewport) {
    console.log("Entro a constructor de PC");
    super(PcImage, graph, stage);
  }
}
