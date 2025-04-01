import { Graphics, EventSystem, FederatedPointerEvent } from "pixi.js";
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

    this.sortableChildren = true;
    this.initializeMovement();
    this.addChild(new Background());

    // Restore saved position
    this.restorePosition();

    this.on("drag-start", () => {
      this.isDragging = true;
    });

    this.on("drag-end", () => {
      setTimeout(() => {
        this.isDragging = false;
      }, 50);
      this.savePosition(); // Save position after movement
    });

    this.on("zoomed-end", () => {
      this.savePosition(); // Save position after zoom
    });

    const onClick = (event: FederatedPointerEvent) => {
      if (!this.isDragging && event.target === this) {
        deselectElement();
      }
    };
    this.on("click", onClick, this);
    this.on("tap", onClick, this);
  }

  // Save the current position of the viewport
  private savePosition() {
    localStorage.setItem(
      "viewportPosition",
      JSON.stringify({ x: this.x, y: this.y }),
    );
    localStorage.setItem(
      "viewportZoom",
      JSON.stringify({ x: this.scale.x, y: this.scale.y }),
    );
  }

  // Restore the saved position of the viewport
  public restorePosition() {
    const savedPosition = localStorage.getItem("viewportPosition");
    const savedZoom = localStorage.getItem("viewportZoom");

    if (savedPosition) {
      const { x, y } = JSON.parse(savedPosition);
      this.position.set(x, y);
    } else {
      this.position.set(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    }

    if (savedZoom) {
      const { x, y } = JSON.parse(savedZoom);
      this.scale.set(x, y);
    } else {
      this.scale.set(1);
    }
  }

  clear() {
    this.removeChildren();
    this.addChild(new Background());
    localStorage.removeItem("viewportPosition");
    localStorage.removeItem("viewportZoom");
  }

  private initializeMovement() {
    this.drag()
      .pinch()
      .wheel()
      .clamp({ direction: "all" })
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
