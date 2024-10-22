import { Graphics, Sprite } from "pixi.js";
import { Device } from "./device"; // Importa la clase Device
import { Edge } from "./edge";

export class NetworkGraph {
  private devices: Map<number, Device> = new Map();
  private edges: Map<number, Edge> = new Map();

  constructor() {}

  // Agregar un dispositivo al grafo
  addDevice(device: Device) {
    if (!this.devices.has(device.id)) {
      this.devices.set(device.id, device);
      console.log(`Dispositivo añadido con ID ${device.id}`);
    } else {
      console.warn(`El dispositivo con ID ${device.id} ya existe en el grafo.`);
    }
  }

  // Agregar una conexión entre dos dispositivos
  addEdge(
    n1Info: { id: number; x: number; y: number },
    n2Info: { id: number; x: number; y: number }
  ): Edge | null {
    if (!this.devices.has(n1Info.id)) {
      console.warn(`El dispositivo con ID ${n1Info.id} no existe en devices.`);
    } else if (!this.devices.has(n2Info.id)) {
      console.warn(`El dispositivo con ID ${n2Info.id} no existe en devices.`);
    } else {
      // Store the start and end positions
      const startPos = { x: n1Info.x, y: n1Info.y };
      const endPos = { x: n2Info.x, y: n2Info.y };
      const edge = new Graphics() as Edge;
      edge.moveTo(startPos.x, startPos.y);
      edge.lineTo(endPos.x, endPos.y);
      edge.stroke({ width: 2, color: 0x3e3e3e });

      edge.startPos = startPos;
      edge.endPos = endPos;
      edge.id = this.edges.size;
      edge.connectedNodes = { n1: n1Info.id, n2: n2Info.id };
      this.edges.set(edge.id, edge);
      console.log(
        `Conexión creada entre dispositivos ID: ${n1Info.id} y ID: ${n2Info.id}`
      );
      return edge;
    }
    return null;
  }

  // Obtener todas las conexiones de un dispositivo
  getConnections(id: number): Edge[] {
    const device = this.devices.get(id);
    return device ? Array.from(this.edges.values()) : [];
  }

  // Obtener un dispositivo específico por su ID
  getDevice(id: number): Device | undefined {
    return this.devices.get(id);
  }

  // Obtener todos los dispositivos en el grafo
  getDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  // Obtener la cantidad de dispositivos en el grafo
  getDeviceCount(): number {
    return this.devices.size;
  }

  // Limpiar el grafo
  clear() {
    this.devices.clear();
  }
}
