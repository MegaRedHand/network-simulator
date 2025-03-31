import { Position } from "../../common";
import { Layer } from "../../layer";
import { DeviceId } from "../../graphs/datagraph";
import { ViewGraph } from "../../graphs/viewgraph";
import { BaseMove } from "./move";

export class DragDeviceMove extends BaseMove {
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
      return false;
    }

    device.x = position.x;
    device.y = position.y;
    viewgraph.deviceMoved(this.did);
    return true;
  }

  undo(viewgraph: ViewGraph): boolean {
    return this.moveDevice(viewgraph, this.startPosition);
  }

  redo(viewgraph: ViewGraph): boolean {
    return this.moveDevice(viewgraph, this.endPosition);
  }
}
