import { GlobalContext } from "../context";
import { Application } from "pixi.js";
import { triggerNew, triggerSave, triggerLoad, triggerPrint } from "./triggers";

export class ShortcutsManager {
  private ctx: GlobalContext;
  private app: Application;

  constructor(ctx: GlobalContext, app: Application) {
    this.ctx = ctx;
    this.app = app;
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
    }
  }
}
