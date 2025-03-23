import { Layer } from "../../layer";
import { CreateDevice } from "../../view-devices/utils";
import { ViewGraph } from "../../graphs/viewgraph";
import { BaseMove } from "./move";
import { DataNode } from "../../graphs/datagraph";

// Superclass for AddDeviceMove and RemoveDeviceMove
export abstract class AddRemoveDeviceMove extends BaseMove {
  data: DataNode;

  constructor(layer: Layer, data: DataNode) {
    // NOTE: we have to deep-copy the data to stop the data from
    // being modified by the original
    super(layer);
    this.data = structuredClone(data);
  }

  addDevice(viewgraph: ViewGraph) {
    const datagraph = viewgraph.getDataGraph();

    // Add the device to the datagraph and the viewgraph
    const deviceInfo = structuredClone(this.data);

    datagraph.addDevice(deviceInfo);
    datagraph.regenerateAllRoutingTables();

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
