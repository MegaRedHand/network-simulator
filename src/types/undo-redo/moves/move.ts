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
