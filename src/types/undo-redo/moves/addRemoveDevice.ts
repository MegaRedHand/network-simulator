import { Layer } from "../../layer";
import { DeviceId, RemovedNodeData } from "../../graphs/datagraph";
import { ViewGraph } from "../../graphs/viewgraph";
import { selectElement } from "../../viewportManager";
import { BaseMove } from "./move";
import { DataNode } from "../../graphs/datagraph";

type DeviceState =
  // Device is new
  | { data: DataNode }
  // Device is in graph
  | { id: DeviceId }
  // Device was removed
  | { removedData: RemovedNodeData };

function isNew(state: DeviceState): state is { data: DataNode } {
  return "data" in state;
}

function isInGraph(state: DeviceState): state is { id: DeviceId } {
  return "id" in state;
}

function wasRemoved(
  state: DeviceState,
): state is { removedData: RemovedNodeData } {
  return "removedData" in state;
}

// Superclass for AddDeviceMove and RemoveDeviceMove
export abstract class AddRemoveDeviceMove extends BaseMove {
  private state: DeviceState;

  constructor(layer: Layer, state: DeviceState) {
    super(layer);
    this.state = state;
  }

  addDevice(viewgraph: ViewGraph) {
    const datagraph = viewgraph.getDataGraph();

    let id;
    // Device is new
    if (isNew(this.state)) {
      // Add the new device
      id = datagraph.addDevice(this.state.data);
    } else if (wasRemoved(this.state)) {
      // Re-add the removed device
      id = datagraph.reAddDevice(this.state.removedData);
      datagraph.regenerateAllRoutingTables();
    }
    this.state = { id };
    this.adjustLayer(viewgraph);
    viewgraph.loadDevice(id);
    selectElement(viewgraph.getDevice(id));
    return true;
  }

  removeDevice(viewgraph: ViewGraph) {
    if (!isInGraph(this.state)) {
      console.error("Tried to remove device without id");
      return false;
    }
    this.adjustLayer(viewgraph);
    const device = viewgraph.getDevice(this.state.id);
    if (device == undefined) {
      return false;
    }
    // This also deselects the element
    const removedData = device.delete();
    this.state = { removedData };
    return true;
  }
}

// "Move" is here because it conflicts with AddDevice from viewportManager
export class AddDeviceMove extends AddRemoveDeviceMove {
  constructor(layer: Layer, data: DataNode) {
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
