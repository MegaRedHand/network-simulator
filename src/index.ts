// Doing this includes the file in the build
import "./style.css";

// Assets
import RouterSvg from "./assets/router.svg";
import ServerSvg from "./assets/server.svg";
import ComputerSvg from "./assets/pc.svg";

import { Application, Graphics, EventSystem, Assets } from "pixi.js";

import * as pixi_viewport from "pixi-viewport";
import { ViewGraph } from "./types/graphs/viewgraph";
import {
  AddPc,
  AddRouter,
  AddServer,
  loadGraph,
  saveGraph,
} from "./types/viewportManager";
import { DataGraph } from "./types/graphs/datagraph";

const WORLD_WIDTH = 10000;
const WORLD_HEIGHT = 10000;

// > context.ts

export class GlobalContext {
  private viewport: Viewport = null;
  private datagraph: DataGraph;
  private viewgraph: ViewGraph;

  initialize(viewport: Viewport) {
    this.viewport = viewport;
    this.datagraph = new DataGraph();
    this.viewgraph = new ViewGraph(this.datagraph, this.viewport);
  }

  getViewport() {
    return this.viewport;
  }

  getViewGraph() {
    return this.viewgraph;
  }

  getDataGraph() {
    return this.datagraph;
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
    button.classList.add("icon-button");

    button.onclick = onClick;
    this.leftBar.appendChild(button);

    const img = document.createElement("img");
    img.src = src;
    img.classList.add("icon-img");
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

// > index.ts

// IIFE to avoid errors
(async () => {

  const lBar = document.getElementById("left-bar");
  const rBar = document.getElementById("right-bar");
  const tBar = document.getElementById("top-bar");

  // Initialization
  const app = new Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
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
    AddRouter(ctx);
  });

  // Add server button
  leftBar.addButton(ServerSvg, () => {
    AddServer(ctx);
  });

  // // Add PC button
  leftBar.addButton(ComputerSvg, () => {
    AddPc(ctx);
  });

  // Get right bar
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const rightBar = RightBar.getFrom(document);

  ctx.initialize(viewport);

  // Ticker logic
  // app.ticker.add(() => { });

  // Resize logic
  function resize() {
    
    const leftBarWidth = lBar ? lBar.offsetWidth : 100;
    const rightBarWidth = rBar ? rBar.offsetWidth : 250;
    const topBarHeight = tBar ? tBar.offsetHeight : 40;

    const newWidth = window.innerWidth - leftBarWidth - rightBarWidth;
    const newHeight = window.innerHeight - topBarHeight;

    app.renderer.resize(newWidth, newHeight);
    viewport.resize(newWidth, newHeight);
  }

  resize();

  window.addEventListener("resize", resize);

  const loadButton = document.getElementById("load-button");
  const saveButton = document.getElementById("save-button");

  saveButton.onclick = () => {
    saveGraph(ctx);
  };

  loadButton.onclick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files[0];
      const reader = new FileReader();
      reader.readAsText(file);

      reader.onload = (readerEvent) => {
        const jsonData = readerEvent.target.result as string;
        loadGraph(jsonData, ctx);
      };
    };

    input.click();
  };

  console.log("initialized!");
})();
