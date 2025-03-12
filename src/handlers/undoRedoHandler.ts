import { GlobalContext } from "../context";
import { urManager } from "../types/viewportManager";
import UndoSvg from "../assets/left-curve-arrow.svg";
import RedoSvg from "../assets/right-curve-arrow.svg";

export class UndoRedoHandler {
  private ctx: GlobalContext;
  private undoButton: HTMLButtonElement | null;
  private redoButton: HTMLButtonElement | null;
  private undoIcon: HTMLImageElement;
  private redoIcon: HTMLImageElement;

  constructor(ctx: GlobalContext) {
    this.ctx = ctx;
    this.undoButton = document.getElementById(
      "undo-button",
    ) as HTMLButtonElement;
    this.redoButton = document.getElementById(
      "redo-button",
    ) as HTMLButtonElement;

    this.undoIcon = document.createElement("img");
    this.undoIcon.src = UndoSvg;
    this.undoIcon.alt = "Undo Icon";

    this.redoIcon = document.createElement("img");
    this.redoIcon.src = RedoSvg;
    this.redoIcon.alt = "Redo Icon";

    if (this.undoButton && this.redoButton) {
      this.setupButtons();
      urManager.suscribe(() => this.updateButtons());
    }
    this.setupShortcuts();
  }

  private setupButtons() {
    if (this.undoButton) {
      this.undoButton.appendChild(this.undoIcon);
      this.undoButton.onclick = () => this.triggerUndo();
    }
    if (this.redoButton) {
      this.redoButton.appendChild(this.redoIcon);
      this.redoButton.onclick = () => this.triggerRedo();
    }
  }

  private updateButtons() {
    if (this.undoButton) {
      this.undoButton.disabled = !urManager.canUndo();
      this.undoIcon.style.opacity = urManager.canUndo() ? "1" : "0.5";
    }
    if (this.redoButton) {
      this.redoButton.disabled = !urManager.canRedo();
      this.redoIcon.style.opacity = urManager.canRedo() ? "1" : "0.5";
    }
  }

  private triggerUndo() {
    if (urManager.canUndo()) {
      urManager.undo(this.ctx.getViewGraph());
    }
  }

  private triggerRedo() {
    if (urManager.canRedo()) {
      urManager.redo(this.ctx.getViewGraph());
    }
  }

  private setupShortcuts() {
    document.addEventListener("keydown", (event) => {
      const activeElement = document.activeElement as HTMLElement;
      if (
        activeElement &&
        (activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement.isContentEditable)
      ) {
        return;
      }

      if (event.ctrlKey) {
        switch (event.key) {
          case "Z": // Ctrl+Shift+Z for Redo
            event.preventDefault();
            this.triggerRedo();
            break;
          case "z": // Ctrl+Z for Undo
            event.preventDefault();
            this.triggerUndo();
            break;
          case "y": // Ctrl+Y for Redo
            event.preventDefault();
            this.triggerRedo();
            break;
        }
      }
    });
  }
}
