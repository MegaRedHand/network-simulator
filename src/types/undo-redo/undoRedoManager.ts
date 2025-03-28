import { ViewGraph } from "../graphs/viewgraph";
import { Move } from "./moves/move";

export class UndoRedoManager {
  undoBuf: Move[] = [];
  redoBuf: Move[] = [];
  listeners: (() => void)[] = [];

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Performs a move and pushes it to the undo buffer.
   */
  push(viewgraph: ViewGraph, move: Move): boolean {
    const ok = move.redo(viewgraph);
    if (ok) {
      this.undoBuf.push(move);
      this.redoBuf = [];
      this.notifyListeners();
    } else {
      console.warn("Move push failed.");
    }
    return ok;
  }

  /**
   * Undoes the last move in the undo buffer.
   */
  undo(viewgraph: ViewGraph) {
    if (!this.canUndo()) {
      return;
    }
    const move = this.undoBuf.pop();
    // Discard the move if it was unsuccessful
    if (move.undo(viewgraph)) {
      this.redoBuf.push(move);
    } else {
      console.error("Undo failed.");
    }
    this.notifyListeners();
  }

  /**
   * Redoes the last move in the redo buffer.
   */
  redo(viewgraph: ViewGraph) {
    if (!this.canRedo()) {
      return;
    }
    const move = this.redoBuf.pop();
    // Discard the move if it was unsuccessful
    if (move.redo(viewgraph)) {
      this.undoBuf.push(move);
    } else {
      console.error("Move failed.");
    }
    this.notifyListeners();
  }

  canUndo(): boolean {
    return this.undoBuf.length !== 0;
  }

  canRedo(): boolean {
    return this.redoBuf.length !== 0;
  }

  subscribe(listener: () => void) {
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
