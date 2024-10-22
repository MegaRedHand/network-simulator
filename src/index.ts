// Doing this includes the file in the build
import "./style.css";

// Assets
import RouterSvg from "./assets/router.svg";
import ServerSvg from "./assets/server.svg";
import ComputerSvg from "./assets/pc.svg";

import {
  Application,
  Graphics,
  GraphicsContext,
  EventSystem,
  Assets,
} from "pixi.js";

import * as pixi_viewport from "pixi-viewport";
import { NetworkGraph } from "./types/networkgraph";
import { AddPc, AddRouter, AddServer } from "./types/viewportManager";

const WORLD_WIDTH = 10000;
const WORLD_HEIGHT = 10000;

// > context.ts

export class GlobalContext {
  private viewport: Viewport = null;
  private network: NetworkGraph = new NetworkGraph();
  i: number = 0;

  initialize(viewport: Viewport) {
    this.viewport = viewport;
  }

  getViewport() {
    return this.viewport;
  }

  getNetwork() {
    return this.network;
  }
}

// > graphics.ts

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

// > left_bar.ts

class LeftBar {
  private leftBar: HTMLElement;

  constructor(leftBar: HTMLElement) {
    this.leftBar = leftBar;
  }
  static getFrom(document: Document) {
    return new LeftBar(document.getElementById("left-bar"));
  }

  addButton(src: string, onClick: () => void) {
    const button = document.createElement("button");
    button.classList.add("tool-button");

    button.onclick = onClick;
    this.leftBar.appendChild(button);

    const img = document.createElement("img");
    img.src = src;
    button.appendChild(img);
  }
}

// > right_bar.ts

class RightBar {
  private rightBar: HTMLElement;

  constructor(rightBar: HTMLElement) {
    this.rightBar = rightBar;
  }
  static getFrom(document: Document) {
    return new RightBar(document.getElementById("right-bar"));
  }
}

class Circle extends Graphics {
  static graphicsContext = new GraphicsContext()
    .circle(0, 0, 10)
    .fill(0xff0000);

  constructor(x: number, y: number) {
    super(Circle.graphicsContext);
    this.x = x;
    this.y = y;
    this.zIndex = 2;
    this.eventMode = "static";
  }
}

// > index.ts

// IIFE to avoid errors
(async () => {
  // Initialization
  const app = new Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: devicePixelRatio,
  });

  const canvasPlaceholder = document.getElementById("canvas");
  canvasPlaceholder.replaceWith(app.canvas);
  await Assets.load(RouterSvg);
  await Assets.load(ServerSvg);
  await Assets.load(ComputerSvg);

  // Context initialization
  const ctx = new GlobalContext();

  // Background container initialization
  const viewport = new Viewport(app.renderer.events);
  app.stage.addChild(viewport);

  // Left bar logic
  const leftBar = LeftBar.getFrom(document);

  // Add router button
  leftBar.addButton(RouterSvg, () => {
    AddRouter(ctx); // Esta es una función anónima que ejecuta AddRouter cuando se hace clic
  });

  // Add server button
  leftBar.addButton(ServerSvg, () => {
    AddServer(ctx); // Función anónima que ejecuta AddServer cuando se hace clic
  });

  // // Add PC button
  leftBar.addButton(ComputerSvg, () => {
    AddPc(ctx); // Función anónima que ejecuta AddPc cuando se hace clic
  });

  // Get right bar
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const rightBar = RightBar.getFrom(document);

  ctx.initialize(viewport);

  // Ticker logic
  // app.ticker.add(() => { });

  // Resize logic
  function resize() {
    const width = app.renderer.canvas.width;
    const height = app.renderer.canvas.height;
    app.renderer.resize(width, height);
    viewport.resize(width, height);
  }
  resize();

  window.addEventListener("resize", resize);

  console.log("initialized!");
})();
