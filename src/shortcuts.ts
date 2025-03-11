import { GlobalContext } from "./context";
import { Application } from "pixi.js";
import { ConfigModal } from "./config";
import {
  triggerNew,
  triggerSave,
  triggerLoad,
  triggerPrint,
  triggerHelp,
  triggerUndo,
  triggerRedo,
  triggerPause,
} from "./triggers";

export class ShortcutsManager {
  private ctx: GlobalContext;
  private app: Application;
  private configModal: ConfigModal;
  private pauseIcon: HTMLImageElement;

  constructor(
    ctx: GlobalContext,
    app: Application,
    configModal: ConfigModal,
    pauseIcon: HTMLImageElement,
  ) {
    this.ctx = ctx;
    this.app = app;
    this.configModal = configModal;
    this.pauseIcon = pauseIcon;
    this.init();
  }

  private init() {
    document.addEventListener("keydown", this.handleKeydown.bind(this));
  }

  private handleKeydown(event: KeyboardEvent) {
    // Prevent shortcuts from executing while typing in an input or textarea
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
          triggerRedo(this.ctx);
          break;
        case "z": // Ctrl+Z for Undo
          event.preventDefault();
          triggerUndo(this.ctx);
          break;
        case "y": // Ctrl+Y for Redo
          event.preventDefault();
          triggerRedo(this.ctx);
          break;
      }
    } else if (event.key == "Escape") {
      event.preventDefault();
      this.configModal.close();
    } else {
      switch (event.key.toLowerCase()) {
        case "n":
          event.preventDefault();
          triggerNew(this.ctx);
          break;
        case "s":
          event.preventDefault();
          triggerSave(this.ctx);
          break;
        case "l":
          event.preventDefault();
          triggerLoad(this.ctx);
          break;
        case "p":
          event.preventDefault();
          triggerPrint(this.app, this.ctx);
          break;
        case "h":
          event.preventDefault();
          triggerHelp(this.configModal);
          break;
        case " ":
          event.preventDefault();
          triggerPause(this.pauseIcon);
          break;
      }
    }
  }
}
