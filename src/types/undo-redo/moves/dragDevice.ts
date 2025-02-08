import { Position } from "../../common";
import { DeviceId } from "../../graphs/datagraph";
import { ViewGraph } from "../../graphs/viewgraph";
import { BaseMove, TypeMove } from "./move";

export class DragDeviceMove extends BaseMove {
  type: TypeMove = TypeMove.DragDevice;
  did: DeviceId;
  startPosition: Position;
  endPosition: Position;

  constructor(did: DeviceId, startPosition: Position, endPosition: Position) {
    super();
    this.did = did;
    this.startPosition = startPosition;
    this.endPosition = endPosition;
  }

  private moveDevice(viewgraph: ViewGraph, position: Position) {
    const device = viewgraph.getDevice(this.did);
    if (!device) {
      throw new Error(`Device with ID ${this.did} not found in viewgraph.`);
    }

    device.x = position.x;
    device.y = position.y;
    viewgraph.deviceMoved(this.did);
  }

  private findNodeType(viewgraph: ViewGraph) {
    const datagraph = viewgraph.getDataGraph();
    const node = datagraph.getDevice(this.did);
    if (!node) {
      console.warn(`Device with id ${this.did} does not exist`);
      return;
    }
    return node.type;
  }

  undo(viewgraph: ViewGraph): void {
    const nodeType = this.findNodeType(viewgraph);
    if (nodeType == undefined) {
      return;
    }
    this.adjustLayer(viewgraph, nodeType);

    this.moveDevice(viewgraph, this.startPosition);
  }

  redo(viewgraph: ViewGraph): void {
    const nodeType = this.findNodeType(viewgraph);
    if (nodeType == undefined) {
      return;
    }
    this.adjustLayer(viewgraph, nodeType);

    this.moveDevice(viewgraph, this.endPosition);
  }
}
