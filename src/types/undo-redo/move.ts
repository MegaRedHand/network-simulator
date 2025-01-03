import { createDevice } from "../devices";
import { CreateDevice } from "../devices/utils";
import { DeviceId } from "../graphs/datagraph";
import { ViewGraph } from "../graphs/viewgraph";

enum TypeMove {
  AddDevice,
  RemoveDevice,
  AddEdge,
  RemoveEdge,
  MoveDevice,
}

export interface Move {
  type: TypeMove;
  undo(viewgraph: ViewGraph): void;
  redo(viewgraph: ViewGraph): void;
}

// El "Move" esta porque se confunde con el AddDevice del viewportManager (¿tal vez cambiar el otro?)
export class AddDeviceMove implements Move {
  type = TypeMove.AddDevice;
  data: CreateDevice;

  constructor(data: CreateDevice) {
    this.data = data;
  }

  undo(viewgraph: ViewGraph): void {
    viewgraph.removeDevice(this.data.id);
  }

  redo(viewgraph: ViewGraph): void {
    // Lo lleva a la posicion original, para tener el movimiento de cambio de posicion esta el MoveDevice
    const device = createDevice(this.data, viewgraph);
    viewgraph.addDevice(device);
    const datagraph = viewgraph.getDataGraph();
    // esto queda feo, tal vez que CreateData y GraphNode sean los mismo
    const deviceInfo = {
      type: this.data.type,
      x: this.data.x,
      y: this.data.y,
      ip: this.data.ip,
      mask: this.data.mask,
      connections: new Set<DeviceId>(),
    };
    datagraph.addDevice(this.data.id, deviceInfo);
    viewgraph.viewport.addChild(device);
  }
}
