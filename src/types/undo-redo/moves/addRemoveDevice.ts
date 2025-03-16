import { Layer } from "../../devices/device";
import {
  DeviceId,
  GraphNode,
  NewDevice,
  RemovedNodeData,
} from "../../graphs/datagraph";
import { ViewGraph } from "../../graphs/viewgraph";
import { selectElement } from "../../viewportManager";
import { BaseMove } from "./move";

// Superclass for AddDeviceMove and RemoveDeviceMove
export abstract class AddRemoveDeviceMove extends BaseMove {
  // TODO: reduce duplicate data
  id?: DeviceId;
  nodeData?: NewDevice;
  removedData?: RemovedNodeData;

  // TODO: simplify
  constructor(layer: Layer, options: { data?: NewDevice; id?: DeviceId }) {
    super(layer);
    if (options.id == undefined) {
      // NOTE: we have to deep-copy the data to stop the data from
      // being modified by the original
      this.nodeData = structuredClone(options.data);
    } else {
      this.id = options.id;
    }
  }

  addDevice(viewgraph: ViewGraph) {
    const datagraph = viewgraph.getDataGraph();

    // It was removed before
    if (this.removedData) {
      datagraph.readdDevice(this.removedData);
      datagraph.regenerateAllRoutingTables();
    } else {
      // Add the new device
      const id = datagraph.addNewDevice(this.nodeData);
      this.id = id;
    }
    this.adjustLayer(viewgraph);
    viewgraph.loadDevice(this.id);
    selectElement(viewgraph.getDevice(this.id));
    return true;
  }

  removeDevice(viewgraph: ViewGraph) {
    this.adjustLayer(viewgraph);
    const device = viewgraph.getDevice(this.id);
    if (device == undefined) {
      return false;
    }
    // This also deselects the element
    this.removedData = device.delete();
    return true;
  }
}

// "Move" is here because it conflicts with AddDevice from viewportManager
export class AddDeviceMove extends AddRemoveDeviceMove {
  constructor(layer: Layer, data: NewDevice) {
    super(layer, { data });
  }

  undo(viewgraph: ViewGraph): boolean {
    return this.removeDevice(viewgraph);
  }

  redo(viewgraph: ViewGraph): boolean {
    return this.addDevice(viewgraph);
  }
}

export class RemoveDeviceMove extends AddRemoveDeviceMove {
  constructor(layer: Layer, id: DeviceId) {
    super(layer, { id });
  }

  undo(viewgraph: ViewGraph): boolean {
    return this.addDevice(viewgraph);
  }

  redo(viewgraph: ViewGraph): boolean {
    return this.removeDevice(viewgraph);
  }
}
