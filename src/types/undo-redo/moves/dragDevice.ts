import { Position } from "../../common";
import { DeviceId } from "../../graphs/datagraph";
import { ViewGraph } from "../../graphs/viewgraph";
import { Move, TypeMove } from "./move";

export class DragDeviceMove implements Move {
  type: TypeMove = TypeMove.DragDevice;
  did: DeviceId;
  startPosition: Position;
  endPosition: Position;

  constructor(did: DeviceId, startPosition: Position, endPosition: Position) {
    this.did = did;
    this.startPosition = startPosition;
    this.endPosition = endPosition;
  }

  undo(viewgraph: ViewGraph): void {
    const device = viewgraph.getDevice(this.did);
    if (!device) {
      throw new Error(`Device with ID ${this.did} not found.`);
    }

    device.x = this.startPosition.x;
    device.y = this.startPosition.y;
    viewgraph.deviceMoved(this.did);
  }

  redo(viewgraph: ViewGraph): void {
    const device = viewgraph.getDevice(this.did);
    if (!device) {
      throw new Error(`Device with ID ${this.did} not found.`);
    }

    device.x = this.endPosition.x;
    device.y = this.endPosition.y;
    viewgraph.deviceMoved(this.did);
  }
}
