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
      viewgraph.changeCurrLayer(this.layerInMove);
    }
  }
}
