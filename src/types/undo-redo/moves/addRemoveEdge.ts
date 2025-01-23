import { Edge, EdgeEdges } from "../../edge";
import { DeviceId, RoutingTableEntry } from "../../graphs/datagraph";
import { ViewGraph } from "../../graphs/viewgraph";
import { Move, TypeMove } from "./move";

export abstract class AddRemoveEdgeMove implements Move {
  type: TypeMove;
  connectedNodes: EdgeEdges;
  abstract undo(viewgraph: ViewGraph): void;
  abstract redo(viewgraph: ViewGraph): void;

  constructor(connectedNodes: EdgeEdges) {
    this.connectedNodes = connectedNodes;
  }

  addEdge(viewgraph: ViewGraph) {
    const { n1, n2 } = this.connectedNodes;
    const device1 = viewgraph.getDevice(n1);
    const device2 = viewgraph.getDevice(n2);
    if (!device1 || !device2) {
      console.warn("Edge’s devices does not exist");
      return;
    }
    viewgraph.addEdge(n1, n2);
    device1.addConnection(n2);
    device2.addConnection(n1);
  }

  removeEdge(viewgraph: ViewGraph) {
    viewgraph.removeEdge(Edge.generateConnectionKey(this.connectedNodes));
  }
}

export class AddEdgeMove extends AddRemoveEdgeMove {
  type: TypeMove = TypeMove.AddEdge;

  undo(viewgraph: ViewGraph): void {
    this.removeEdge(viewgraph);
  }

  redo(viewgraph: ViewGraph): void {
    this.addEdge(viewgraph);
  }
}

export class RemoveEdgeMove extends AddRemoveEdgeMove {
  type: TypeMove = TypeMove.RemoveEdge;
  private storedRoutingTables: Map<DeviceId, RoutingTableEntry[]>;

  constructor(connectedNodes: EdgeEdges, storedRoutingTables: Map<DeviceId, RoutingTableEntry[]>) {
    super(connectedNodes);
    this.storedRoutingTables = storedRoutingTables;
  }

  undo(viewgraph: ViewGraph): void {
    this.addEdge(viewgraph);

    // Restaurar las tablas de enrutamiento guardadas
    this.storedRoutingTables.forEach((table, deviceId) => {
      viewgraph.datagraph.setRoutingTable(deviceId, table);
    });
  }

  redo(viewgraph: ViewGraph): void {
    this.removeEdge(viewgraph);
  }
}
