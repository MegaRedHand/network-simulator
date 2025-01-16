import { DeviceId } from "../../graphs/datagraph";
import { EdgeId, ViewGraph } from "../../graphs/viewgraph";
import { Move, TypeMove } from "./move";

export interface EdgeData {
  edgeId: EdgeId;
  connectedNodes: { n1: DeviceId; n2: DeviceId };
}

export abstract class AddRemoveEdgeMove implements Move {
  type: TypeMove;
  data: EdgeData;
  abstract undo(viewgraph: ViewGraph): void;
  abstract redo(viewgraph: ViewGraph): void;

  constructor(data: EdgeData) {
    this.data = data;
  }

  addEdge(viewgraph: ViewGraph) {
    const { n1, n2 } = this.data.connectedNodes;
    const device1 = viewgraph.getDevice(n1);
    const device2 = viewgraph.getDevice(n2);
    if (!device1 || !device2) {
      console.warn("Edge’s devices does not exist");
      return;
    }
    viewgraph.addEdge(n1, n2, this.data.edgeId);
    device1.addConnection(this.data.edgeId, n2);
    device2.addConnection(this.data.edgeId, n1);
  }

  removeEdge(viewgraph: ViewGraph) {
    viewgraph.removeEdge(this.data.edgeId);
  }
}

export class AddEdgeMove extends AddRemoveEdgeMove {
  type: TypeMove = TypeMove.AddEdge;
  data: EdgeData;

  constructor(data: EdgeData) {
    super(data);
  }

  undo(viewgraph: ViewGraph): void {
    this.removeEdge(viewgraph);
  }

  redo(viewgraph: ViewGraph): void {
    this.addEdge(viewgraph);
  }
}

export class RemoveEdgeMove extends AddRemoveEdgeMove {
  type: TypeMove = TypeMove.RemoveEdge;
  data: EdgeData;

  constructor(data: EdgeData) {
    super(data);
  }

  undo(viewgraph: ViewGraph): void {
    this.addEdge(viewgraph);
  }

  redo(viewgraph: ViewGraph): void {
    this.removeEdge(viewgraph);
  }
}
