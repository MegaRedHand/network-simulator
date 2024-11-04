import { Graphics } from "pixi.js";
import { Device } from "./../device"; // Importa la clase Device
import { Edge } from "./../edge";
import { DataGraph } from "./datagraph";
import { Viewport } from "../..";

export class ViewGraph {
  private devices = new Map<number, Device>();
  private edges = new Map<number, Edge>();
  private idCounter = 1;
  private datagraph: DataGraph;
  viewport: Viewport;

  constructor(datagraph: DataGraph, viewport: Viewport) {
    this.datagraph = datagraph;
    this.viewport = viewport;
    datagraph.constructView(this);
  }

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
  addEdge(device1Id: number, device2Id: number): number | null {
    if (device1Id === device2Id) {
      console.warn(
        `No se puede crear una conexión entre el mismo dispositivo (ID ${device1Id}).`,
      );
      return null;
    }

    if (!this.devices.has(device1Id)) {
      console.warn(`El dispositivo con ID ${device1Id} no existe en devices.`);
    } else if (!this.devices.has(device2Id)) {
      console.warn(`El dispositivo con ID ${device2Id} no existe en devices.`);
    } else {
      // Verificar si ya existe una arista entre estos dos dispositivos
      // cambiar esto
      for (const edge of this.edges.values()) {
        const { n1, n2 } = edge.connectedNodes;
        if (
          (n1 === device1Id && n2 === device2Id) ||
          (n1 === device2Id && n2 === device1Id)
        ) {
          console.warn(
            `La conexión entre ID ${device1Id} y ID ${device2Id} ya existe.`,
          );
          return null;
        }
      }

      const device1 = this.devices.get(device1Id);
      const device2 = this.devices.get(device2Id);

      if (device1 && device2) {
        // Calcula el ángulo entre los dos dispositivos
        const dx = device2.x - device1.x;
        const dy = device2.y - device1.y;
        const angle = Math.atan2(dy, dx);

        // Ajusta los puntos de inicio y fin para que estén en el borde de los íconos
        const offsetX1 = (device1.width / 2) * Math.cos(angle);
        const offsetY1 = (device1.height / 2) * Math.sin(angle);
        const offsetX2 = (device2.width / 2) * Math.cos(angle);
        const offsetY2 = (device2.height / 2) * Math.sin(angle);

        const startPos = {
          x: device1.x + offsetX1,
          y: device1.y + offsetY1,
        };
        const endPos = {
          x: device2.x - offsetX2,
          y: device2.y - offsetY2,
        };

        // Crear la arista como instancia de Edge
        const edge = new Edge(
          this.idCounter++,
          { n1: device1Id, n2: device2Id },
          startPos,
          endPos,
          this,
        );
        this.edges.set(edge.id, edge);

        this.datagraph.addEdge(device1Id, device2Id);
        this.viewport.addChild(edge);

        console.log(
          `Conexión creada entre dispositivos ID: ${device1Id} y ID: ${device2Id}`,
        );

        return edge.id;
      }
    }
    return null;
  }

  deviceMoved(deviceId: number) {
    const device: Device = this.devices.get(deviceId);
    device.getConnections().forEach((connection) => {
      const edge = this.edges.get(connection.edgeId);
      if (
        !(
          edge.connectedNodes.n1 == connection.adyacentId ||
          edge.connectedNodes.n2 == connection.adyacentId
        )
      ) {
        return;
      }
      // Obtener los dispositivos de inicio y fin directamente
      const startDevice =
        edge.connectedNodes.n1 === device.id
          ? device
          : this.devices.get(connection.adyacentId);

      const endDevice =
        edge.connectedNodes.n1 === device.id
          ? this.devices.get(connection.adyacentId)
          : device;

      if (startDevice && endDevice) {
        const dx = endDevice.x - startDevice.x;
        const dy = endDevice.y - startDevice.y;
        const angle = Math.atan2(dy, dx);

        // Ajustar el punto de inicio y fin para que estén en el borde del ícono
        const offsetX = (startDevice.width / 2) * Math.cos(angle);
        const offsetY = (startDevice.height / 2) * Math.sin(angle);

        // Calcular las nuevas posiciones para el inicio y fin de la arista
        const newStartPos = {
          x: startDevice.x + offsetX,
          y: startDevice.y + offsetY,
        };
        const newEndPos = {
          x: endDevice.x - offsetX,
          y: endDevice.y - offsetY,
        };

        // Redibuja la arista
        edge.drawEdge(newStartPos, newEndPos);
      }
    });
    this.datagraph.updateDevicePosition(deviceId, { x: device.x, y: device.y });
  }

  // Obtener todas las conexiones de un disevicestartDeviceitivo
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
    this.devices.forEach((device) => {
      device.deleteDevice();
    });
    // ya no deberian quedar aristas por borrar
    this.devices.clear();
    this.edges.clear();
    this.idCounter = 1;
  }

  // Método para eliminar un dispositivo y sus conexiones (edges)
  removeDevice(id: number) {
    const device = this.devices.get(id);

    if (!device) {
      console.warn(`El dispositivo con ID ${id} no existe en el grafo.`);
      return;
    }

    device.getConnections().forEach((connection) => {
      const adyacentDevice = this.devices.get(connection.adyacentId);
      const edge = this.edges.get(connection.edgeId);
      if (edge) {
        if (adyacentDevice) {
          adyacentDevice.removeConnection(edge.id);
        }
        edge.deleteEdge();
      }
    });

    // Remover el dispositivo del viewport y lo destruimos
    this.viewport.removeChild(device);
    device.destroy({ children: true });

    // Finalmente, eliminar el dispositivo del grafo
    this.datagraph.removeDevice(id);
    this.devices.delete(id);
    console.log(
      `Dispositivo con ID ${id} y todas sus conexiones fueron eliminados.`,
    );
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

    // Remover la arista del viewport y la destruimos
    this.viewport.removeChild(edge);
    edge.destroy();

    // Eliminar la arista del mapa de edges y del datagraph
    this.datagraph.removeConnection(n1, n2);
    this.edges.delete(edgeId);

    console.log(
      `Arista con ID ${edgeId} eliminada entre dispositivos ${n1} y ${n2}.`,
    );
  }

  getViewport() {
    return this.viewport;
  }

  // Método para imprimir toda la data del grafo en consola
  logGraphData() {
    console.log("===== ViewGraph Data =====");

    // Imprimir información de los dispositivos
    console.log("Devices:");
    this.devices.forEach((device, id) => {
      console.log(`- ID: ${id}`);
      console.log(`  Type: ${device.constructor.name}`);
      console.log(`  Position: x=${device.x}, y=${device.y}`);
      console.log(
        `  Connections: ${Array.from(device.connections.keys()).join(", ") || "None"}`,
      );
    });

    // Imprimir información de las conexiones
    console.log("Edges:");
    this.edges.forEach((edge, id) => {
      console.log(`- Edge ID: ${id}`);
      console.log(
        `  Connected Devices: ${edge.connectedNodes.n1} <-> ${edge.connectedNodes.n2}`,
      );
      console.log(
        `  Start Position: x=${edge.startPos.x}, y=${edge.startPos.y}`,
      );
      console.log(`  End Position: x=${edge.endPos.x}, y=${edge.endPos.y}`);
    });

    console.log("==========================");
  }
}
