import { DeviceType } from "../../devices/device";
import { CreateDevice } from "../../devices/utils";
import { DeviceId, RoutingTableEntry } from "../../graphs/datagraph";
import { ViewGraph } from "../../graphs/viewgraph";
import { Move, TypeMove } from "./move";

// Superclass for AddDeviceMove and RemoveDeviceMove
export abstract class AddRemoveDeviceMove implements Move {
  type: TypeMove;
  data: CreateDevice;
  abstract undo(viewgraph: ViewGraph): void;
  abstract redo(viewgraph: ViewGraph): void;

  constructor(data: CreateDevice) {
    // NOTE: we have to deep-copy the data to stop the data from
    // being modified by the original
    this.data = structuredClone(data);
  }

  addDevice(viewgraph: ViewGraph) {
    const datagraph = viewgraph.getDataGraph();

    // Add the device to the datagraph and the viewgraph
    datagraph.addDevice(this.data.id, this.data.node);
    viewgraph.addDevice(this.data);
  }

  removeDevice(viewgraph: ViewGraph) {
    const device = viewgraph.getDevice(this.data.id);
    if (!device) {
      throw new Error(`Device with ID ${this.data.id} not found.`);
    }
    device.delete();
  }
}

// "Move" is here because it conflicts with AddDevice from viewportManager
export class AddDeviceMove extends AddRemoveDeviceMove {
  type = TypeMove.AddDevice;

  undo(viewgraph: ViewGraph): void {
    this.removeDevice(viewgraph);
  }

  redo(viewgraph: ViewGraph): void {
    this.addDevice(viewgraph);
  }
}

// Check if the viewgraph is the best place to load the move into the manager
export class RemoveDeviceMove extends AddRemoveDeviceMove {
  type: TypeMove = TypeMove.RemoveDevice;
  data: CreateDevice; // Data of the removed device
  connections: DeviceId[];
  private storedRoutingTables: Map<DeviceId, RoutingTableEntry[]>;

  constructor(
    data: CreateDevice,
    connections: DeviceId[],
    viewgraph: ViewGraph, // Pasamos la vista para obtener las tablas de enrutamiento
  ) {
    super(data);
    this.connections = connections;
    this.storedRoutingTables = new Map();

    // Guardar la tabla de enrutamiento del dispositivo eliminado si es un router
    if (data.node.type === DeviceType.Router) {
      const routingTable = viewgraph.getRoutingTable(data.id);
      if (routingTable) {
        this.storedRoutingTables.set(data.id, [...routingTable]);
      }
    }

    // Guardar las tablas de los dispositivos conectados
    connections.forEach((adjacentId) => {
      const routingTable = viewgraph.getRoutingTable(adjacentId);
      if (routingTable) {
        this.storedRoutingTables.set(adjacentId, [...routingTable]);
      }
    });

    console.log(
      "Stored routing tables before removal:",
      this.storedRoutingTables,
    );
  }

  undo(viewgraph: ViewGraph): void {
    this.addDevice(viewgraph);
    const device = viewgraph.getDevice(this.data.id);

    // Restaurar conexiones con los dispositivos adyacentes
    this.connections.forEach((adjacentId) => {
      const adjacentDevice = viewgraph.getDevice(adjacentId);

      if (adjacentDevice) {
        viewgraph.addEdge(this.data.id, adjacentId);
        device.addConnection(adjacentId);
        adjacentDevice.addConnection(this.data.id);
      } else {
        console.warn(
          `Adjacent Device ${adjacentId} not found while reconnecting Device ${device.id}`,
        );
      }
    });

    // Restaurar las tablas de enrutamiento de todos los dispositivos involucrados
    this.storedRoutingTables.forEach((table, deviceId) => {
      viewgraph.getDataGraph().setRoutingTable(deviceId, table);
    });

    console.log(
      `Routing tables restored for devices:`,
      this.storedRoutingTables.keys(),
    );
  }

  redo(viewgraph: ViewGraph): void {
    this.removeDevice(viewgraph);
  }
}
