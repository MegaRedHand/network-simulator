import { Position } from "../common";
import { createDevice } from "../devices";
import { DeviceType } from "../devices/device";
import { CreateDevice } from "../devices/utils";
import { DeviceId, GraphNode } from "../graphs/datagraph";
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

export class MoveDevice {
  type: TypeMove = TypeMove.MoveDevice;
  did: DeviceId;
  startPosition: Position;
  endPosition: Position;

  constructor(did: DeviceId, startPosition: Position, endPosition: Position) {
    this.did = did;
    this.startPosition = startPosition;
    this.endPosition = endPosition;
  }

  undo(viewgraph: ViewGraph): void {
    const device = viewgraph.getDevice(this.did);
    if (!device) {
      throw new Error(`Device with ID ${this.did} not found.`);
    }

    device.x = this.startPosition.x;
    device.y = this.startPosition.y;
    viewgraph.deviceMoved(this.did);
  }

  redo(viewgraph: ViewGraph): void {
    const device = viewgraph.getDevice(this.did);
    if (!device) {
      throw new Error(`Device with ID ${this.did} not found.`);
    }

    device.x = this.endPosition.x;
    device.y = this.endPosition.y;
    viewgraph.deviceMoved(this.did);
  }
}

