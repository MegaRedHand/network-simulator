import { Position } from "../../common";
import { Layer } from "../../devices/layer";
import { DeviceId } from "../../graphs/datagraph";
import { ViewGraph } from "../../graphs/viewgraph";
import { BaseMove, TypeMove } from "./move";

export class DragDeviceMove extends BaseMove {
  type: TypeMove = TypeMove.DragDevice;
  did: DeviceId;
  startPosition: Position;
  endPosition: Position;

  constructor(
    layer: Layer,
    did: DeviceId,
    startPosition: Position,
    endPosition: Position,
  ) {
    super(layer);
    this.did = did;
    this.startPosition = startPosition;
    this.endPosition = endPosition;
  }

  private moveDevice(viewgraph: ViewGraph, position: Position) {
    this.adjustLayer(viewgraph);

    const device = viewgraph.getDevice(this.did);
    if (!device) {
      throw new Error(`Device with ID ${this.did} not found in viewgraph.`);
    }

    device.x = position.x;
    device.y = position.y;
    viewgraph.deviceMoved(this.did);
  }

  undo(viewgraph: ViewGraph): void {
    this.moveDevice(viewgraph, this.startPosition);
  }

  redo(viewgraph: ViewGraph): void {
    this.moveDevice(viewgraph, this.endPosition);
  }
}
