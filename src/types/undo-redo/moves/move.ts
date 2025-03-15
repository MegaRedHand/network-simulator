import { Layer, layerIncluded } from "../../devices/layer";
import { ViewGraph } from "../../graphs/viewgraph";

export interface Move {
  /**
   * Undoes the move.
   * @returns true if the move was successfully undone, false otherwise.
   */
  undo(viewgraph: ViewGraph): void;

  /**
   * Performs the move.
   * @returns true if the move was successfully done, false otherwise.
   */
  redo(viewgraph: ViewGraph): void;
}

export abstract class BaseMove implements Move {
  layerInMove: Layer;
  abstract undo(viewgraph: ViewGraph): void;
  abstract redo(viewgraph: ViewGraph): void;

  constructor(layer: Layer) {
    this.layerInMove = layer;
  }

  protected adjustLayer(viewgraph: ViewGraph) {
    if (!layerIncluded(this.layerInMove, viewgraph.getLayer())) {
      viewgraph.changeCurrLayer(this.layerInMove);
    }
  }
}
