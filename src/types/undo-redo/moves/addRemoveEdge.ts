import { Layer } from "../../layer";
import { DataEdge, DeviceId } from "../../graphs/datagraph";
import { ViewGraph } from "../../graphs/viewgraph";
import { deselectElement } from "../../viewportManager";
import { BaseMove } from "./move";

interface EdgePair {
  n1: DeviceId;
  n2: DeviceId;
}

type EdgeState =
  // Edge is new
  | { newData: EdgePair }
  // Edge is in graph
  | { connectedNodes: EdgePair }
  // Edge was removed
  | { removedData: DataEdge };

function isNew(state: EdgeState): state is { newData: EdgePair } {
  return "newData" in state;
}

function isInGraph(state: EdgeState): state is { connectedNodes: EdgePair } {
  return "connectedNodes" in state;
}

function wasRemoved(state: EdgeState): state is { removedData: DataEdge } {
  return "removedData" in state;
}

export abstract class AddRemoveEdgeMove extends BaseMove {
  private state: EdgeState;

  constructor(layer: Layer, state: EdgeState) {
    super(layer);
    this.state = state;
  }

  addEdge(viewgraph: ViewGraph) {
    if (isInGraph(this.state)) {
      console.error("Edge is already in graph");
      return false;
    }
    this.adjustLayer(viewgraph);

    if (wasRemoved(this.state)) {
      // Re-add the removed edge
      const ok = viewgraph.reAddEdge(this.state.removedData);
      if (!ok) {
        console.warn("Failed to re-add edge");
        return false;
      }
      const n1 = this.state.removedData.from.id;
      const n2 = this.state.removedData.to.id;
      this.state = { connectedNodes: { n1, n2 } };
    } else if (isNew(this.state)) {
      // Add the new edge
      const pair = { n1: this.state.newData.n1, n2: this.state.newData.n2 };
      const ok = viewgraph.addNewEdge(pair.n1, pair.n2);
      if (!ok) {
        console.warn("Failed to add new edge");
        return false;
      }
      this.state = { connectedNodes: pair };
    }
    return true;
  }

  removeEdge(viewgraph: ViewGraph) {
    if (!isInGraph(this.state)) {
      console.error("Tried to remove already removed edge");
      return false;
    }

    this.adjustLayer(viewgraph);

    // Remove the edge
    const n1 = this.state.connectedNodes.n1;
    const n2 = this.state.connectedNodes.n2;
    const edgeData = viewgraph.removeEdge(n1, n2);

    if (!edgeData) {
      return false;
    }

    // TODO: store routing tables
    this.state = { removedData: edgeData };
    // Deselect to avoid showing the information of the deleted edge
    // TODO: this isnt needed I think
    deselectElement();
    return true;
  }
}

export class AddEdgeMove extends AddRemoveEdgeMove {
  constructor(layer: Layer, n1: DeviceId, n2: DeviceId) {
    super(layer, { newData: { n1, n2 } });
  }

  undo(viewgraph: ViewGraph): boolean {
    return this.removeEdge(viewgraph);
  }

  redo(viewgraph: ViewGraph): boolean {
    return this.addEdge(viewgraph);
  }
}

export class RemoveEdgeMove extends AddRemoveEdgeMove {
  constructor(layer: Layer, n1: DeviceId, n2: DeviceId) {
    super(layer, { connectedNodes: { n1, n2 } });
  }

  undo(viewgraph: ViewGraph): boolean {
    return this.addEdge(viewgraph);
  }

  redo(viewgraph: ViewGraph): boolean {
    return this.removeEdge(viewgraph);
  }
}
