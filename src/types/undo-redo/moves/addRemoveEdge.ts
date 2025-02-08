import { DeviceType, layerFromType } from "../../devices/device";
import { Layer, layerIncluded } from "../../devices/layer";
import { Edge, EdgeEdges } from "../../edge";
import { DeviceId, RoutingTableEntry } from "../../graphs/datagraph";
import { ViewGraph } from "../../graphs/viewgraph";
import { BaseMove, TypeMove } from "./move";

export abstract class AddRemoveEdgeMove extends BaseMove {
  type: TypeMove;
  connectedNodes: EdgeEdges;
  abstract undo(viewgraph: ViewGraph): void;
  abstract redo(viewgraph: ViewGraph): void;

  constructor(connectedNodes: EdgeEdges) {
    super();
    this.connectedNodes = connectedNodes;
  }

  static getMajorLayerType(
    viewgraph: ViewGraph,
    id1: DeviceId,
    id2: DeviceId,
  ): DeviceType {
    const datagraph = viewgraph.getDataGraph();
    const node1 = datagraph.getDevice(id1);
    const node2 = datagraph.getDevice(id2);
    if (!(node1 && node2)) {
      console.warn("Edge's devices does not exist");
      return;
    }
    return layerIncluded(layerFromType(node1.type), layerFromType(node2.type))
      ? node2.type
      : node1.type;
  }

  addEdge(viewgraph: ViewGraph) {
    const { n1, n2 } = this.connectedNodes;

    const majorLayerType = AddRemoveEdgeMove.getMajorLayerType(
      viewgraph,
      n1,
      n2,
    );
    if (majorLayerType == undefined) {
      return;
    }
    this.adjustLayer(viewgraph, majorLayerType);

    const device1 = viewgraph.getDevice(n1);
    const device2 = viewgraph.getDevice(n2);
    if (!device1 || !device2) {
      console.warn("Edge's devices not found in viewgraph");
      return;
    }
    viewgraph.addEdge(n1, n2);
    device1.addConnection(n2);
    device2.addConnection(n1);
  }

  removeEdge(viewgraph: ViewGraph) {
    const { n1, n2 } = this.connectedNodes;

    const majorLayerType = AddRemoveEdgeMove.getMajorLayerType(
      viewgraph,
      n1,
      n2,
    );
    if (majorLayerType == undefined) {
      return;
    }
    this.adjustLayer(viewgraph, majorLayerType);

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

  constructor(
    connectedNodes: EdgeEdges,
    storedRoutingTables: Map<DeviceId, RoutingTableEntry[]>,
  ) {
    super(connectedNodes);
    this.storedRoutingTables = storedRoutingTables;
  }

  undo(viewgraph: ViewGraph): void {
    this.addEdge(viewgraph);

    // Restaurar las tablas de enrutamiento guardadas
    this.storedRoutingTables.forEach((table, deviceId) => {
      viewgraph.getDataGraph().setRoutingTable(deviceId, table);
    });
  }

  redo(viewgraph: ViewGraph): void {
    this.removeEdge(viewgraph);
  }
}
