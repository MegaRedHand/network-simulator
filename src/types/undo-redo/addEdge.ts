import { DeviceId } from "../graphs/datagraph";
import { EdgeId, ViewGraph } from "../graphs/viewgraph";
import { Move, TypeMove } from "./move";

export interface AddEdgeData {
  edgeId: EdgeId;
  connectedNodes: { n1: DeviceId; n2: DeviceId };
}

export class AddEdgeMove implements Move {
  type: TypeMove = TypeMove.AddEdge;
  data: AddEdgeData;

  constructor(data: AddEdgeData) {
    this.data = data;
  }

  undo(viewgraph: ViewGraph): void {
    viewgraph.removeEdge(this.data.edgeId);
  }

  redo(viewgraph: ViewGraph): void {
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
}
