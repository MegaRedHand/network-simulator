import { Layer, layerIncluded } from "../../devices/layer";
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
  layerInMove: Layer;
  undo(viewgraph: ViewGraph): void;
  redo(viewgraph: ViewGraph): void;
}

export abstract class BaseMove implements Move {
  abstract type: TypeMove;
  layerInMove: Layer;
  abstract undo(viewgraph: ViewGraph): void;
  abstract redo(viewgraph: ViewGraph): void;

  constructor(layer: Layer) {
    this.layerInMove = layer;
  }

  adjustLayer(viewgraph: ViewGraph) {
    if (!layerIncluded(this.layerInMove, viewgraph.getLayer())) {
      console.log("Entre a cambiar el layer del viewgraph");
      viewgraph.changeCurrLayer(this.layerInMove);
    }
  }
}
