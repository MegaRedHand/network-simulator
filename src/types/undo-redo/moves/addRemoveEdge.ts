import { Layer } from "../../layer";
import { DataEdge, DeviceId, RoutingTableEntry } from "../../graphs/datagraph";
import { ViewGraph } from "../../graphs/viewgraph";
import { deselectElement } from "../../viewportManager";
import { BaseMove } from "./move";

type EdgeState =
  // Edge is new / was removed
  | { data: DataEdge }
  // Edge is in graph
  | { n1: DeviceId; n2: DeviceId };

function isInGraph(state: EdgeState): state is { n1: DeviceId; n2: DeviceId } {
  return "n1" in state;
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

    const n1 = this.state.data.from.id;
    const n2 = this.state.data.to.id;

    // Add the new edge
    // TODO: update
    const ok = viewgraph.addEdge(n1, n2);
    if (!ok) {
      console.warn("Edge data is invalid");
      return false;
    }
    this.state = { n1, n2 };
    return true;
  }

  removeEdge(viewgraph: ViewGraph) {
    if (!isInGraph(this.state)) {
      console.error("Tried to remove already removed edge");
      return false;
    }

    this.adjustLayer(viewgraph);

    // Remove the edge
    // TODO: update
    const edgeData = viewgraph.removeEdge(this.state.n1, this.state.n2);

    // Avoid deselecting in case of failure, since it's probably a virtual edge
    if (!edgeData) {
      return false;
    }

    // TODO: store routing tables
    this.state = { data: edgeData };
    // Deselect to avoid showing the information of the deleted edge
    deselectElement();
    return true;
  }
}

export class AddEdgeMove extends AddRemoveEdgeMove {
  constructor(layer: Layer, edgeData: DataEdge) {
    super(layer, { data: edgeData });
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
    super(layer, { n1, n2 });
  }

  undo(viewgraph: ViewGraph): boolean {
    return this.addEdge(viewgraph);
  }

  redo(viewgraph: ViewGraph): boolean {
    return this.removeEdge(viewgraph);
  }
}
