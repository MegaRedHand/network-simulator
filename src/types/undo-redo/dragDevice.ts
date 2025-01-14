import { Position } from "../common";
import { DeviceId } from "../graphs/datagraph";
import { ViewGraph } from "../graphs/viewgraph";
import { Move, TypeMove } from "./move";

// Tener una funciona aparte donde hacer la logica de ambos, que es la misma, y que ambos llamen a esa funcion
// Hacer un metodo de Device que sea para moverlo, asi nos ahorramos de acordarse de avisar al viewgraph
// Revisar si el viewgraph es el mejor lugar donde registrar el movimiento
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
