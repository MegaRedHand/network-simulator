import { DeviceType, Layer } from "../../devices/device";
import { CreateDevice } from "../../devices/utils";
import { DeviceId, RoutingTableEntry } from "../../graphs/datagraph";
import { ViewGraph } from "../../graphs/viewgraph";
import { BaseMove, TypeMove } from "./move";

// Superclass for AddDeviceMove and RemoveDeviceMove
export abstract class AddRemoveDeviceMove extends BaseMove {
  data: CreateDevice;

  constructor(layer: Layer, data: CreateDevice) {
    // NOTE: we have to deep-copy the data to stop the data from
    // being modified by the original
    super(layer);
    this.data = structuredClone(data);
  }

  addDevice(viewgraph: ViewGraph) {
    const datagraph = viewgraph.getDataGraph();

    // Add the device to the datagraph and the viewgraph
    const deviceInfo = structuredClone(this.data.node);
    datagraph.addDevice(this.data.id, deviceInfo);

    this.adjustLayer(viewgraph);

    const deviceData = structuredClone(this.data);
    viewgraph.addDevice(deviceData);
  }

  removeDevice(viewgraph: ViewGraph) {
    this.adjustLayer(viewgraph);
    const device = viewgraph.getDevice(this.data.id);
    if (device == undefined) {
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
  private storedRoutingTables: Map<DeviceId, RoutingTableEntry[]>;

  constructor(
    layer: Layer,
    data: CreateDevice,
    viewgraph: ViewGraph, // Pasamos la vista para obtener las tablas de enrutamiento
  ) {
    super(layer, data);
    this.storedRoutingTables = new Map();

    // Guardar la tabla de enrutamiento del dispositivo eliminado si es un router
    if (data.node.type === DeviceType.Router) {
      const routingTable = viewgraph.getRoutingTable(data.id);
      if (routingTable) {
        this.storedRoutingTables.set(data.id, [...routingTable]);
      }
    }

    // Guardar las tablas de los dispositivos conectados
    data.node.connections.forEach((adjacentId) => {
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
