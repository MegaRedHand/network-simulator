import { Graphics, EventSystem } from "pixi.js";
import * as pixi_viewport from "pixi-viewport";
import { deselectElement } from "../types/viewportManager";

const WORLD_WIDTH = 10000;
const WORLD_HEIGHT = 10000;

class Background extends Graphics {
  constructor() {
    super();
    this.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill(0xe3e2e1);
    this.zIndex = 0;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}

export class Viewport extends pixi_viewport.Viewport {
  static usedPlugins = ["drag", "pinch"];
  private isDragging = false;

  constructor(events: EventSystem) {
    super({
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
      events: events,
    });
    this.moveCenter(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.sortableChildren = true;
    this.initializeMovement();

    this.addChild(new Background());

    // Track drag start
    this.on('drag-start', () => {
      this.isDragging = true;
    });

    // Track drag end
    this.on('drag-end', () => {
      setTimeout(() => {
        this.isDragging = false;
      }, 50); // Small delay to ensure click doesn't trigger after drag
    });

    // Only deselect if it's a genuine click, not a drag
    this.on('click', (event) => {
      if (!this.isDragging && event.target === this) {
        deselectElement();
      }
    });
  }

  clear() {
    this.removeChildren();
    this.addChild(new Background());
    this.moveCenter(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
  }

  private initializeMovement() {
    this.drag()
      .pinch()
      .wheel()
      .clamp({ direction: "all" })
      // TODO: revisit when all icons are finalized
      .clampZoom({
        minHeight: 200,
        minWidth: 200,
        maxWidth: WORLD_WIDTH / 2,
        maxHeight: WORLD_HEIGHT / 2,
      });
  }

  enableMovement() {
    for (const plugin of Viewport.usedPlugins) {
      this.plugins.resume(plugin);
    }
  }

  disableMovement() {
    for (const plugin of Viewport.usedPlugins) {
      this.plugins.pause(plugin);
    }
  }
}
