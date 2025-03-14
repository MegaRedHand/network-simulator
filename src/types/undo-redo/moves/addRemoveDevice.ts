import { Layer } from "../../devices/device";
import { CreateDevice } from "../../devices/utils";
import { ViewGraph } from "../../graphs/viewgraph";
import { BaseMove } from "./move";

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
    // Clone array to avoid modifying the original
    const connections = Array.from(this.data.connections);

    datagraph.addDevice(this.data.id, deviceInfo, connections);
    datagraph.regenerateAllRoutingTables();

    this.adjustLayer(viewgraph);

    viewgraph.loadDevice(this.data.id);
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
  undo(viewgraph: ViewGraph): void {
    this.removeDevice(viewgraph);
  }

  redo(viewgraph: ViewGraph): void {
    this.addDevice(viewgraph);
  }
}

export class RemoveDeviceMove extends AddRemoveDeviceMove {
  undo(viewgraph: ViewGraph): void {
    this.addDevice(viewgraph);
  }

  redo(viewgraph: ViewGraph): void {
    this.removeDevice(viewgraph);
  }
}
