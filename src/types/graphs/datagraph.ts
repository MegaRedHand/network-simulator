import { Viewport } from "../..";
import { Device, Pc, Router, Server } from "../device";
import { ViewGraph } from "./viewgraph";

export interface GraphNode {
  x: number;
  y: number;
  type: string;
  connections: Set<number>;
}

export class DataGraph {
  private devices = new Map<number, GraphNode>();
  private idCounter = 1;

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
      if (this.idCounter <= idDevice) {
        this.idCounter = idDevice + 1;
      }
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

  updateDevicePosition(id: number, newValues: { x?: number; y?: number }) {
    const deviceGraphNode = this.devices.get(id);
    if (!deviceGraphNode) {
      console.warn("Device’s id is not registered");
      return;
    }
    this.devices.set(id, { ...deviceGraphNode, ...newValues });
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

  // Método para eliminar un dispositivo y todas sus conexiones
  removeDevice(id: number): void {
    const device = this.devices.get(id);

    if (!device) {
      console.warn(`El dispositivo con ID ${id} no existe en el grafo.`);
      return;
    }

    // Eliminar la conexión del nodo actual en los dispositivos conectados
    device.connections.forEach((connectedId) => {
      // se puede hacer que lo haga el device directamente
      const connectedDevice = this.devices.get(connectedId);
      if (connectedDevice) {
        connectedDevice.connections.delete(id);
      }
    });

    // Eliminar el nodo del grafo
    this.devices.delete(id);
    console.log(`Dispositivo con ID ${id} y sus conexiones fueron eliminados.`);
  }

  // Método para eliminar una conexión (edge) entre dos dispositivos por sus IDs
  removeConnection(n1Id: number, n2Id: number): void {
    const device1 = this.devices.get(n1Id);
    const device2 = this.devices.get(n2Id);

    if (!device1) {
      console.warn(`El dispositivo con ID ${n1Id} no existe en el grafo.`);
      return;
    }

    if (!device2) {
      console.warn(`El dispositivo con ID ${n2Id} no existe en el grafo.`);
      return;
    }

    // Verificar que la conexión existe
    if (!device1.connections.has(n2Id) || !device2.connections.has(n1Id)) {
      console.warn(`La conexión entre ID ${n1Id} y ID ${n2Id} no existe.`);
      return;
    }

    // Eliminar la conexión en ambos dispositivos
    device1.connections.delete(n2Id);
    device2.connections.delete(n1Id);

    console.log(
      `Conexión eliminada entre dispositivos ID: ${n1Id} y ID: ${n2Id}`,
    );
  }

  // Limpiar el grafo
  clear() {
    this.devices.clear();
    this.idCounter = 1;
  }

  constructView(viewgraph: ViewGraph) {
    console.log("Entra al constructView de DataGraph");
    const connections: Set<{ deviceId: number; adyacentId: number }> = new Set<{
      deviceId: number;
      adyacentId: number;
    }>();
    this.devices.forEach((graphNode, deviceId) => {
      let device: Device;
      switch (graphNode.type) {
        case "Router":
          device = new Router(deviceId, viewgraph, {
            x: graphNode.x,
            y: graphNode.y,
          });
          break;
        case "Server":
          device = new Server(deviceId, viewgraph, {
            x: graphNode.x,
            y: graphNode.y,
          });
          break;
        case "Pc":
          device = new Pc(deviceId, viewgraph, {
            x: graphNode.x,
            y: graphNode.y,
          });
          break;
      }
      viewgraph.addDevice(device);
      graphNode.connections.forEach((adyacentId) => {
        if (!connections.has({ deviceId: adyacentId, adyacentId: deviceId })) {
          connections.add({ deviceId, adyacentId });
        }
      });
    });
    console.log("Se termino de crear los dispositivos");
    viewgraph.logGraphData();
    connections.forEach((connection) => {
      const device1 = viewgraph.getDevice(connection.deviceId);
      const device2 = viewgraph.getDevice(connection.adyacentId);
      device1.connectTo(device2.id); // se supone que lo intenta agregar nuevamente al datagraph pero como ya existe el datagraph no lo hace
    });
    console.log("Termino con el constructView de DataGraph");
    viewgraph.logGraphData();
  }
}
