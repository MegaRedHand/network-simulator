import { Graphics } from "pixi.js";
import { Device } from "./../device"; // Importa la clase Device
import { Edge } from "./../edge";
import { DataGraph } from "./datagraph";

export class ViewGraph {
  private devices = new Map<number, Device>();
  private edges = new Map<number, Edge>();
  private idCounter = 0;

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
    n2Info: { id: number; x: number; y: number },
    datagraph: DataGraph,
  ): Edge | null {
    if (n1Info.id === n2Info.id) {
      console.warn(
        `No se puede crear una conexión entre el mismo dispositivo (ID ${n1Info.id}).`,
      );
      return null;
    }

    if (!this.devices.has(n1Info.id)) {
      console.warn(`El dispositivo con ID ${n1Info.id} no existe en devices.`);
    } else if (!this.devices.has(n2Info.id)) {
      console.warn(`El dispositivo con ID ${n2Info.id} no existe en devices.`);
    } else {
      // Verificar si ya existe una arista entre estos dos dispositivos
      for (const edge of this.edges.values()) {
        const { n1, n2 } = edge.connectedNodes;
        if (
          (n1 === n1Info.id && n2 === n2Info.id) ||
          (n1 === n2Info.id && n2 === n1Info.id)
        ) {
          console.warn(
            `La conexión entre ID ${n1Info.id} y ID ${n2Info.id} ya existe.`,
          );
          return null;
        }
      }

      const device1 = this.devices.get(n1Info.id);
      const device2 = this.devices.get(n2Info.id);

      if (device1 && device2) {
        // Calcula el ángulo entre los dos dispositivos
        const dx = device2.sprite.x - device1.sprite.x;
        const dy = device2.sprite.y - device1.sprite.y;
        const angle = Math.atan2(dy, dx);

        // Ajusta los puntos de inicio y fin para que estén en el borde de los íconos
        const offsetX1 = (device1.sprite.width / 2) * Math.cos(angle);
        const offsetY1 = (device1.sprite.height / 2) * Math.sin(angle);
        const offsetX2 = (device2.sprite.width / 2) * Math.cos(angle);
        const offsetY2 = (device2.sprite.height / 2) * Math.sin(angle);

        const startPos = {
          x: device1.sprite.x + offsetX1,
          y: device1.sprite.y + offsetY1,
        };
        const endPos = {
          x: device2.sprite.x - offsetX2,
          y: device2.sprite.y - offsetY2,
        };

        // Crear la arista como instancia de Edge
        const edge = new Edge(this.idCounter++, { n1: n1Info.id, n2: n2Info.id }, startPos, endPos, datagraph, this);
        this.edges.set(edge.id, edge);

        console.log(
          `Conexión creada entre dispositivos ID: ${n1Info.id} y ID: ${n2Info.id}`,
        );

        return edge;
      }
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

  // Método para eliminar un dispositivo y sus conexiones (edges)
  removeDevice(id: number) {
    const device = this.devices.get(id);

    if (!device) {
      console.warn(`El dispositivo con ID ${id} no existe en el grafo.`);
      return;
    }

    // Eliminar todas las conexiones del dispositivo en cuestión
    const edgesToRemove = Array.from(this.edges.values()).filter(
      (edge) => edge.connectedNodes.n1 === id || edge.connectedNodes.n2 === id
    );

    edgesToRemove.forEach((edge) => {
      // Remover la conexión de los otros dispositivos conectados
      const otherDeviceId = edge.connectedNodes.n1 === id ? edge.connectedNodes.n2 : edge.connectedNodes.n1;
      const otherDevice = this.devices.get(otherDeviceId);

      if (otherDevice) {
        otherDevice.connections.delete(edge.id);
      }

      // Remover la arista (edge) del grafo
      this.edges.delete(edge.id);
      edge.destroy(); // Eliminar los recursos gráficos del edge
    });

    // Finalmente, eliminar el dispositivo del grafo
    this.devices.delete(id);
    console.log(`Dispositivo con ID ${id} y todas sus conexiones fueron eliminados.`);
  }

  // Método para eliminar una arista específica por su ID
  removeEdge(edgeId: number) {
    const edge = this.edges.get(edgeId);

    if (!edge) {
      console.warn(`La arista con ID ${edgeId} no existe en el grafo.`);
      return;
    }

    // Obtener los IDs de los dispositivos conectados por esta arista
    const { n1, n2 } = edge.connectedNodes;

    // Eliminar la conexión de los dispositivos conectados
    const device1 = this.devices.get(n1);
    const device2 = this.devices.get(n2);

    if (device1) {
      device1.connections.delete(edgeId);
    }

    if (device2) {
      device2.connections.delete(edgeId);
    }

    // Eliminar la arista del mapa de edges
    this.edges.delete(edgeId);

    console.log(`Arista con ID ${edgeId} eliminada entre dispositivos ${n1} y ${n2}.`);
  }

  // Método para imprimir toda la data del grafo en consola
  logGraphData() {
    console.log("===== ViewGraph Data =====");
    
    // Imprimir información de los dispositivos
    console.log("Devices:");
    this.devices.forEach((device, id) => {
      console.log(`- ID: ${id}`);
      console.log(`  Type: ${device.constructor.name}`);
      console.log(`  Position: x=${device.sprite.x}, y=${device.sprite.y}`);
      console.log(`  Connections: ${Array.from(device.connections.keys()).join(", ") || "None"}`);
    });
    
    // Imprimir información de las conexiones
    console.log("Edges:");
    this.edges.forEach((edge, id) => {
      console.log(`- Edge ID: ${id}`);
      console.log(`  Connected Devices: ${edge.connectedNodes.n1} <-> ${edge.connectedNodes.n2}`);
      console.log(`  Start Position: x=${edge.startPos.x}, y=${edge.startPos.y}`);
      console.log(`  End Position: x=${edge.endPos.x}, y=${edge.endPos.y}`);
    });
    
    console.log("==========================");
  }
}
