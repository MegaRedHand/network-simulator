import { Graphics } from "pixi.js";
import { Device } from "./device"; // Importa la clase Device
import { Edge } from "./edge";

// import { v4 as uuidv4 } from "uuid";

// function generateUniqueId(): string {
//   return uuidv4();
// }

// npm install uuid

export interface GraphNode {
  x: number;
  y: number;
  type: string;
  connections: Set<number>;
}

export class DataGraph {
  private devices = new Map<number, GraphNode>();
  private idCounter = 0;

  // Agregar un nuevo dispositivo al grafo
  addNewDevice(deviceInfo: { x: number; y: number; type: string }): number {
    const id = this.idCounter++;
    const graphnode: GraphNode = {
      ...deviceInfo,
      connections: new Set<number>(),
    };
    this.devices.set(id, graphnode);
    console.log(`Dispositivo añadido con ID ${id}`);
    return id;
  }

  // Agregar un dispositivo al grafo
  addDevice(idDevice: number, deviceInfo: GraphNode) {
    if (!this.devices.has(idDevice)) {
      this.devices.set(idDevice, deviceInfo);
      console.log(`Dispositivo añadido con ID ${idDevice}`);
    } else {
      console.warn(`El dispositivo con ID ${idDevice} ya existe en el grafo.`);
    }
  }

  // Agregar una conexión entre dos dispositivos
  addEdge(n1Id: number, n2Id: number) {
    if (n1Id === n2Id) {
      console.warn(
        `No se puede crear una conexión entre el mismo dispositivo (ID ${n1Id}).`,
      );
    } else if (!this.devices.has(n1Id)) {
      console.warn(`El dispositivo con ID ${n1Id} no existe en devices.`);
    } else if (!this.devices.has(n2Id)) {
      console.warn(`El dispositivo con ID ${n2Id} no existe en devices.`);
      // Verificar si ya existe una arista entre estos dos dispositivos
    } else if (this.devices.get(n1Id).connections.has(n2Id)) {
      console.warn(`La conexión entre ID ${n1Id} y ID ${n2Id} ya existe.`);
    } else {
      this.devices.get(n1Id).connections.add(n2Id);
      this.devices.get(n2Id).connections.add(n1Id);

      console.log(
        `Conexión creada entre dispositivos ID: ${n1Id} y ID: ${n2Id}`,
      );
    }
  }

  getDevice(id: number): GraphNode | undefined {
    return this.devices.get(id);
  }

  // Obtener todas las conexiones de un dispositivo
  getConnections(id: number): number[] {
    const deviceInfo = this.devices.get(id);
    return deviceInfo.connections
      ? Array.from(deviceInfo.connections.values())
      : [];
  }

  // Obtener todos los dispositivos en el grafo
  getDevices(): [number, GraphNode][] {
    return Array.from(this.devices.entries());
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
