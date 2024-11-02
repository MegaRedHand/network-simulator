import { Graphics } from "pixi.js";
import { Device } from "./device"; // Importa la clase Device
import { Edge } from "./edge";

export class NetworkGraph {
  private devices = new Map<number, Device>();
  private edges = new Map<number, Edge>();

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

        // Dibuja la línea
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

  // Obtener una arista específica por los IDs de sus nodos
  getEdge(startId: number, endId: number): Edge | undefined {
    for (const edge of this.edges.values()) {
      const { n1, n2 } = edge.connectedNodes;
      if ((n1 === startId && n2 === endId) || (n1 === endId && n2 === startId)) {
        console.log(`Arista encontrada entre ID ${startId} y ID ${endId}`);
        return edge;
      }
    }
    return undefined; // Si no se encuentra la arista
  }

  // Método para actualizar las posiciones de las aristas
  updateEdges() {
    for (const edge of this.edges.values()) {
      const { n1, n2 } = edge.connectedNodes;
    
      const device1 = this.devices.get(n1);
      const device2 = this.devices.get(n2);
    
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
      
        edge.startPos = {
          x: device1.sprite.x + offsetX1,
          y: device1.sprite.y + offsetY1,
        };
        edge.endPos = {
          x: device2.sprite.x - offsetX2,
          y: device2.sprite.y - offsetY2,
        };
      
        // Redibuja la línea con las nuevas posiciones
        edge.clear(); // Limpia la línea existente
        edge.moveTo(edge.startPos.x, edge.startPos.y);
        edge.lineTo(edge.endPos.x, edge.endPos.y);
        edge.stroke({ width: 2, color: 0x3e3e3e });
      }
    }
  }


  // Limpiar el grafo
  clear() {
    this.devices.clear();
  }
}
