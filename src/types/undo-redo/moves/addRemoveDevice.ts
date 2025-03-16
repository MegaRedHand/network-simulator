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

function addDevice(viewgraph: ViewGraph, data: DeviceData) {
  const datagraph = viewgraph.getDataGraph();

  // If ID was unspecified, it means it's a new device
  if (data.id == undefined) {
    const id = datagraph.addNewDevice(data.node);
    data.id = id;
    data.connections = [];
  } else {
    // Add the device to the datagraph and the viewgraph
    const deviceInfo = structuredClone(data.node);
    // Clone array to avoid modifying the original
    const connections = Array.from(data.connections);

    datagraph.addDevice(data.id, deviceInfo, connections);
    datagraph.regenerateAllRoutingTables();
  }
  this.adjustLayer(viewgraph);
  viewgraph.loadDevice(data.id);
  selectElement(viewgraph.getDevice(data.id));
  return true;
}

function removeDevice(viewgraph: ViewGraph, data: DeviceData) {
  this.adjustLayer(viewgraph);
  const device = viewgraph.getDevice(data.id);
  if (device == undefined) {
    return false;
  }
  // This also deselects the element
  device.delete();
  return true;
}

// "Move" is here because it conflicts with AddDevice from viewportManager
export class AddDeviceMove extends BaseMove {
  data: DeviceData;

  constructor(layer: Layer, data: DeviceData) {
    // NOTE: we have to deep-copy the data to stop the data from
    // being modified by the original
    super(layer);
    this.data = structuredClone(data);
  }

  undo(viewgraph: ViewGraph): boolean {
    return removeDevice(viewgraph, this.data);
  }

  redo(viewgraph: ViewGraph): boolean {
    return addDevice(viewgraph, this.data);
  }
}

export class RemoveDeviceMove extends BaseMove {
  data: DeviceData;

  constructor(layer: Layer, data: DeviceData) {
    // NOTE: we have to deep-copy the data to stop the data from
    // being modified by the original
    super(layer);
    this.data = structuredClone(data);
  }

  undo(viewgraph: ViewGraph): boolean {
    return addDevice(viewgraph, this.data);
  }

  redo(viewgraph: ViewGraph): boolean {
    return removeDevice(viewgraph, this.data);
  }
}
