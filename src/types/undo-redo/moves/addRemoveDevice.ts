import { Layer } from "../../devices/device";
import { DeviceId, GraphNode } from "../../graphs/datagraph";
import { ViewGraph } from "../../graphs/viewgraph";
import { selectElement } from "../../viewportManager";
import { BaseMove } from "./move";

export interface DeviceData {
  id?: DeviceId;
  node: GraphNode;
  connections?: DeviceId[];
}

// Superclass for AddDeviceMove and RemoveDeviceMove
export abstract class AddRemoveDeviceMove extends BaseMove {
  data: DeviceData;

  constructor(layer: Layer, data: DeviceData) {
    // NOTE: we have to deep-copy the data to stop the data from
    // being modified by the original
    super(layer);
    this.data = structuredClone(data);
  }

  addDevice(viewgraph: ViewGraph) {
    const datagraph = viewgraph.getDataGraph();

    // If ID was unspecified, it means it's a new device
    if (this.data.id == undefined) {
      const id = datagraph.addNewDevice(this.data.node);
      this.data.id = id;
      this.data.connections = [];
    } else {
      // Add the device to the datagraph and the viewgraph
      const deviceInfo = structuredClone(this.data.node);
      // Clone array to avoid modifying the original
      const connections = Array.from(this.data.connections);

      datagraph.addDevice(this.data.id, deviceInfo, connections);
      datagraph.regenerateAllRoutingTables();
    }
    this.adjustLayer(viewgraph);
    viewgraph.loadDevice(this.data.id);
    selectElement(viewgraph.getDevice(this.data.id));
    return true;
  }

  removeDevice(viewgraph: ViewGraph) {
    this.adjustLayer(viewgraph);
    const device = viewgraph.getDevice(this.data.id);
    if (device == undefined) {
      return false;
    }
    device.delete();
    return true;
  }
}

// "Move" is here because it conflicts with AddDevice from viewportManager
export class AddDeviceMove extends AddRemoveDeviceMove {
  undo(viewgraph: ViewGraph): boolean {
    return this.removeDevice(viewgraph);
  }

  redo(viewgraph: ViewGraph): boolean {
    return this.addDevice(viewgraph);
  }
}

export class RemoveDeviceMove extends AddRemoveDeviceMove {
  undo(viewgraph: ViewGraph): boolean {
    return this.addDevice(viewgraph);
  }

  redo(viewgraph: ViewGraph): boolean {
    return this.removeDevice(viewgraph);
  }
}
