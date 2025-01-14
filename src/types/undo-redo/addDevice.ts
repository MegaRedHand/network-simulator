import { DeviceType } from "../devices/device";
import { createDevice, CreateDevice } from "../devices/utils";
import { DeviceId, GraphNode } from "../graphs/datagraph";
import { ViewGraph } from "../graphs/viewgraph";
import { Move, TypeMove } from "./move";

// El "Move" esta porque se confunde con el AddDevice del viewportManager (¿tal vez cambiar el otro?)
export class AddDeviceMove implements Move {
  type = TypeMove.AddDevice;
  data: CreateDevice;

  constructor(data: CreateDevice) {
    this.data = data;
  }

  undo(viewgraph: ViewGraph): void {
    const device = viewgraph.getDevice(this.data.id);
    if (!device) {
      throw new Error(`Device with ID ${this.data.id} not found.`);
    }
    viewgraph.removeDevice(this.data.id, false);
  }

  redo(viewgraph: ViewGraph): void {
    // Crear el dispositivo nuevamente
    const device = createDevice(this.data, viewgraph);

    const datagraph = viewgraph.getDataGraph();

    // Construir el deviceInfo con la lógica para manejar los routers
    const deviceInfo = {
      type: this.data.type,
      x: this.data.x,
      y: this.data.y,
      ip: this.data.ip,
      mask: this.data.mask,
      connections: new Set<DeviceId>(),
      ...(this.data.type === DeviceType.Router && { routingTable: [] }), // Agregar routingTable si es un router
    };

    // Agregar el dispositivo al datagraph y al viewgraph
    datagraph.addDevice(this.data.id, deviceInfo as GraphNode);
    viewgraph.addDevice(device);
    viewgraph.viewport.addChild(device);
  }
}
