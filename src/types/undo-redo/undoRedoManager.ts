import { ViewGraph } from "../graphs/viewgraph";
import { deselectElement } from "../viewportManager";
import { Move } from "./moves/move";

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
    console.log(this.redoBuf);
    console.log(this.undoBuf);
    deselectElement();
  }

  redo(viewgraph: ViewGraph) {
    if (this.redoBuf.length != 0) {
      const move = this.redoBuf.pop();
      // rehacer el movimineto con move
      move.redo(viewgraph);
      this.undoBuf.push(move); // tal vez hay que guardar otra cosa
    }
    this.notifyListeners();
    console.log(this.redoBuf);
    console.log(this.undoBuf);
    deselectElement();
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

  /**
   * Resets the UndoRedoManager by clearing both undo and redo buffers.
   */
  reset() {
    this.undoBuf = [];
    this.redoBuf = [];
    this.notifyListeners();
    console.log("UndoRedoManager has been reset.");
  }
}
