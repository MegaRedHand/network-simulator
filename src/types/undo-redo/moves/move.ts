import { DeviceType, layerFromType } from "../../devices/device";
import { layerIncluded } from "../../devices/layer";
import { ViewGraph } from "../../graphs/viewgraph";

export enum TypeMove {
  AddDevice,
  RemoveDevice,
  AddEdge,
  RemoveEdge,
  DragDevice,
}

export interface Move {
  type: TypeMove;
  undo(viewgraph: ViewGraph): void;
  redo(viewgraph: ViewGraph): void;
}

export abstract class BaseMove implements Move {
  abstract type: TypeMove;
  abstract undo(viewgraph: ViewGraph): void;
  abstract redo(viewgraph: ViewGraph): void;

  constructor() {}

  adjustLayer(viewgraph: ViewGraph, deviceType: DeviceType) {
    const deviceLayer = layerFromType(deviceType);
    if (!layerIncluded(deviceLayer, viewgraph.getLayer())) {
      console.log("Entre a cambiar el layer del viewgraph");
      viewgraph.changeCurrLayer(deviceLayer);
    }
  }
}
