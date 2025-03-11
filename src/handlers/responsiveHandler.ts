import { Application } from "pixi.js";
import { Viewport } from "../graphics/viewport";

export class ResponsiveHandler {
  private app: Application;
  private viewport: Viewport;
  private lBar: HTMLElement | null;
  private rBar: HTMLElement | null;
  private tBar: HTMLElement | null;

  constructor(app: Application, viewport: Viewport) {
    this.app = app;
    this.viewport = viewport;
    this.lBar = document.getElementById("left-bar");
    this.rBar = document.getElementById("right-bar");
    this.tBar = document.getElementById("top-bar");

    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.setupCanvasWrapper();
  }

  private resize() {
    // Check if the layout should be stacked (based on window width)
    const isStacked = window.innerWidth <= 768;

    // Determine the size of the left bar (width if not stacked, height if stacked)
    const leftSize = isStacked
      ? this.lBar?.offsetHeight || 0
      : this.lBar?.offsetWidth || 0;

    // Determine the size of the right bar (width if not stacked, height if stacked)
    const rightSize = isStacked
      ? this.rBar?.offsetHeight || 0
      : this.rBar?.offsetWidth || 0;

    // Get the height of the top bar
    const topHeight = this.tBar?.offsetHeight || 0;

    // Calculate the new width and height for the canvas
    let newWidth = window.innerWidth - (isStacked ? 0 : leftSize + rightSize);
    let newHeight =
      window.innerHeight - (isStacked ? leftSize + rightSize : topHeight);

    // Ensure minimum dimensions to prevent the canvas from becoming too small
    newWidth = Math.max(300, newWidth);
    newHeight = Math.max(200, newHeight);

    // Log the new dimensions for debugging
    console.log("📏 Resizing canvas to:", newWidth, "x", newHeight);

    // Resize the app renderer and viewport accordingly
    this.app.renderer.resize(newWidth, newHeight);
    this.viewport.resize(newWidth, newHeight);
  }

  private setupCanvasWrapper() {
    // Get the element with the ID "canvas-wrapper"
    const canvasWrapper = document.getElementById("canvas-wrapper");

    // Check if the element exists before adding event listeners
    if (canvasWrapper) {
      // When the mouse enters the canvas wrapper, prevent scrolling
      canvasWrapper.addEventListener("mouseenter", () => {
        document.body.classList.add("no-scroll");
      });

      // When the mouse leaves the canvas wrapper, allow scrolling again
      canvasWrapper.addEventListener("mouseleave", () => {
        document.body.classList.remove("no-scroll");
      });
    }
  }
}
