import { DeviceType } from "../devices/device";
import { createDevice, CreateDevice } from "../devices/utils";
import { DeviceId, GraphNode } from "../graphs/datagraph";
import { EdgeId, ViewGraph } from "../graphs/viewgraph";
import { Move, TypeMove } from "./move";

// Revisar si el viewgraph es el mejor lugar donde cargar el movimiento al manager
export class RemoveDeviceMove implements Move {
  type: TypeMove = TypeMove.RemoveDevice;
  data: CreateDevice; // Datos del dispositivo eliminado
  connections: { edgeId: number; adyacentId: DeviceId }[]; // Conexiones del dispositivo (puede agregarse a CreateDevice)

  constructor(
    data: CreateDevice,
    connections: { edgeId: EdgeId; adyacentId: DeviceId }[],
  ) {
    this.data = data;
    this.connections = connections;
  }

  undo(viewgraph: ViewGraph): void {
    // Restaurar el dispositivo eliminado

    const datagraph = viewgraph.getDataGraph();

    // Construir el deviceInfo con la lógica para manejar los routers
    const deviceInfo = {
      type: this.data.type,
      x: this.data.x,
      y: this.data.y,
      ip: this.data.ip,
      mask: this.data.mask,
      connections: new Set(),
      ...(this.data.type === DeviceType.Router && { routingTable: [] }), // Agregar routingTable si es un router
    };

    // Agregar el dispositivo al datagraph y al viewgraph
    datagraph.addDevice(this.data.id, deviceInfo as GraphNode);
    const device = viewgraph.addDevice(this.data);

    // Restaurar conexiones usando connectTo
    this.connections.forEach(({ edgeId, adyacentId }) => {
      const adyacentDevice = viewgraph.getDevice(adyacentId);

      if (adyacentDevice) {
        viewgraph.addEdge(this.data.id, adyacentId, edgeId);
        device.addConnection(edgeId, adyacentId);
        adyacentDevice.addConnection(edgeId, this.data.id);
      } else {
        console.warn(
          `Adjacent Device ${adyacentId} not found while reconnecting Device ${device.id}`,
        );
      }
    });
  }

  redo(viewgraph: ViewGraph): void {
    // Eliminar nuevamente el dispositivo
    const device = viewgraph.getDevice(this.data.id);
    if (!device) {
      throw new Error(`Device with ID ${this.data.id} not found.`);
    }
    device.delete();
  }
}
