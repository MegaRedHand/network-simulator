import { ViewGraph } from "../graphs/viewgraph";
import { Move } from "./move";

export class UndoRedoManager {
  undoBuf: Move[] = [];
  redoBuf: Move[] = [];
  listeners: (() => void)[] = [];

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  push(move: Move) {
    if (this.redoBuf.length != 0) {
      this.redoBuf = [];
    }
    this.undoBuf.push(move);
    this.notifyListeners();
  }

  undo(viewgraph: ViewGraph) {
    if (this.undoBuf.length != 0) {
      const move = this.undoBuf.pop();
      // revertir el movimiento con move
      move.undo(viewgraph);
      this.redoBuf.push(move); // tal vez hay que guardar otra cosa
    }
    this.notifyListeners();
  }

  redo(viewgraph: ViewGraph) {
    if (this.redoBuf.length != 0) {
      const move = this.redoBuf.pop();
      // rehacer el movimineto con move
      move.redo(viewgraph);
      this.undoBuf.push(move); // tal ves hay que guardar otra cosa
    }
    this.notifyListeners();
  }

  canUndo(): boolean {
    return this.undoBuf.length != 0;
  }

  canRedo(): boolean {
    return this.redoBuf.length != 0;
  }

  suscribe(listener: () => void) {
    this.listeners.push(listener);
  }
}
