// Doing this includes the file in the build
import "./style.css";

// Assets
import RouterSvg from "./assets/router.svg";
import ServerSvg from "./assets/server.svg";
import ComputerSvg from "./assets/pc.svg";
import PlaySvg from "./assets/play-icon.svg";
import PauseSvg from "./assets/pause-icon.svg";

import { Application, Graphics, EventSystem, Assets } from "pixi.js";

import * as pixi_viewport from "pixi-viewport";
import { ViewGraph } from "./types/graphs/viewgraph";
import {
  AddDevice,
  loadFromFile,
  loadFromLocalStorage,
  saveToFile,
  saveToLocalStorage,
  selectElement,
} from "./types/viewportManager";
import { DataGraph } from "./types/graphs/datagraph";
import { Packet } from "./types/packet";
import { DeviceType, Layer } from "./types/devices/device";

const WORLD_WIDTH = 10000;
const WORLD_HEIGHT = 10000;

// > context.ts

export class GlobalContext {
  private viewport: Viewport = null;
  private datagraph: DataGraph;
  private viewgraph: ViewGraph;
  private saveIntervalId: NodeJS.Timeout | null = null;

  initialize(viewport: Viewport) {
    this.viewport = viewport;
    loadFromLocalStorage(this);
  }

  private setNetWork(datagraph: DataGraph, layer: Layer) {
    this.datagraph = datagraph;
    this.viewport.clear();
    this.viewgraph = new ViewGraph(this.datagraph, this.viewport, layer);
  }

  load(datagraph: DataGraph, layer: Layer = Layer.Link) {
    this.setNetWork(datagraph, layer);
    this.setupAutoSave();
    saveToLocalStorage(this);
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

  private setupAutoSave() {
    this.clearAutoSave();

    this.datagraph.subscribeChanges(() => {
      if (this.saveIntervalId) {
        clearInterval(this.saveIntervalId);
      }
      this.saveIntervalId = setInterval(() => {
        saveToLocalStorage(this);
        clearInterval(this.saveIntervalId);
      }, 100);
    });
  }

  private clearAutoSave() {
    // Limpia el intervalo y evita duplicados
    if (this.saveIntervalId) {
      clearInterval(this.saveIntervalId);
      this.saveIntervalId = null;
    }
  }

  // (!) For layer abstraction functionality
  // changeViewGraph(layer: string) {
  //   this.setNetWork(this.datagraph, Layer.fromName(layer));
  // }
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

    this.on("click", (event) => {
      // If the click target is the viewport itself, deselect any selected element
      if (event.target === this) {
        selectElement(null);
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

// > left_bar.ts

class LeftBar {
  private leftBar: HTMLElement;

  constructor(leftBar: HTMLElement) {
    this.leftBar = leftBar;
  }

  static getFrom(document: Document) {
    return new LeftBar(document.getElementById("left-bar"));
  }

  addButton(src: string, onClick: () => void, label: string) {
    const button = document.createElement("button");
    button.classList.add("icon-button");
    button.setAttribute("title", label); // Shows Text

    button.onclick = onClick;
    this.leftBar.appendChild(button);

    const img = document.createElement("img");
    img.src = src;
    img.classList.add("icon-img");
    button.appendChild(img);
  }
}

export class RightBar {
  private static instance: RightBar | null = null; // Unique instance
  private rightBar: HTMLElement;

  private constructor(rightBar: HTMLElement) {
    this.rightBar = rightBar;
    this.initializeBaseContent();
  }

  // Static method to get the unique instance of RightBar
  static getInstance() {
    // If an instance already exists, return it. If not, create it.
    if (!RightBar.instance) {
      const rightBarElement = document.getElementById("right-bar");
      if (!rightBarElement) {
        console.error("Element with ID 'right-bar' not found.");
        return null;
      }
      RightBar.instance = new RightBar(rightBarElement);
    }
    return RightBar.instance;
  }

  // Initializes the base title and info container (called only once)
  private initializeBaseContent() {
    const title = document.createElement("h2");
    title.textContent = "Information";
    this.rightBar.appendChild(title);

    const infoContent = document.createElement("div");
    infoContent.id = "info-content";
    this.rightBar.appendChild(infoContent);
  }

  // Method to clear only the content of info-content
  clearContent() {
    const infoContent = this.rightBar.querySelector("#info-content");
    if (infoContent) {
      infoContent.innerHTML = ""; // Clears only the content of info-content
    }
  }

  // Shows specific information of an element in info-content
  renderInfo(title: string, info: { label: string; value: string }[]) {
    this.clearContent(); // Clears before adding new content

    const infoContent = document.getElementById("info-content");
    if (infoContent) {
      const header = document.createElement("h3");
      header.textContent = title;
      infoContent.appendChild(header);

      info.forEach((item) => {
        const p = document.createElement("p");
        p.innerHTML = `<strong>${item.label}:</strong> ${item.value}`;
        infoContent.appendChild(p);
      });
    }
  }

  // Adds a standard button to the right-bar
  addButton(
    text: string,
    onClick: () => void,
    buttonClass = "right-bar-button",
    toggleSelected = false,
  ) {
    const infoContent = document.getElementById("info-content");
    if (infoContent) {
      const button = document.createElement("button");
      button.classList.add(...buttonClass.split(" "));
      button.textContent = text;
      button.onclick = () => {
        onClick();
        if (toggleSelected) {
          button.classList.toggle("selected-button"); // Changes color on click
        }
      };
      infoContent.appendChild(button);
    }
  }

  // Adds a select dropdown to the right-bar
  addDropdown(
    label: string,
    options: { value: string; text: string }[],
    selectId?: string,
  ) {
    const infoContent = document.getElementById("info-content");
    const container = document.createElement("div");
    container.classList.add("dropdown-container");

    const labelElement = document.createElement("label");
    labelElement.textContent = label;
    labelElement.classList.add("right-bar-label");

    const select = document.createElement("select");
    select.classList.add("right-bar-select");
    if (selectId) select.id = selectId;

    options.forEach((optionData) => {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.text;
      select.appendChild(option);
    });

    // Default onchange behavior: logs the selected value
    select.onchange = () => {
      console.log(`Selected ${label}:`, select.value);
    };

    container.appendChild(labelElement);
    container.appendChild(select);
    infoContent.appendChild(container);
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
  RightBar.getInstance();

  // Add router button
  leftBar.addButton(
    RouterSvg,
    () => AddDevice(ctx, DeviceType.Router),
    "Add Router",
  );

  // Add server button
  leftBar.addButton(
    ServerSvg,
    () => AddDevice(ctx, DeviceType.Server),
    "Add Server",
  );

  // Add PC button
  leftBar.addButton(ComputerSvg, () => AddDevice(ctx, DeviceType.Pc), "Add PC");

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

  const newButton = document.getElementById("new-button");
  const loadButton = document.getElementById("load-button");
  const saveButton = document.getElementById("save-button");

  newButton.onclick = () => ctx.load(new DataGraph());
  saveButton.onclick = () => saveToFile(ctx);
  loadButton.onclick = () => loadFromFile(ctx);

  const pauseButton = document.getElementById("pause-button");
  let paused = false;

  const pauseIcon = document.createElement("img");
  pauseIcon.src = PauseSvg;
  pauseIcon.alt = "Pause Icon";

  pauseButton.appendChild(pauseIcon);

  const triggerPause = () => {
    paused = !paused;

    if (paused) {
      pauseIcon.src = PlaySvg;
      pauseButton.style.backgroundColor = "#f44336";
      pauseButton.title = "Resume";
      Packet.pauseAnimation();
    } else {
      pauseIcon.src = PauseSvg;
      pauseButton.style.backgroundColor = "#228b22";
      pauseButton.title = "Pause";
      Packet.unpauseAnimation();
    }
  };

  pauseButton.onclick = triggerPause;

  // (!) For layer abstraction functionality
  // const layerSelect = document.getElementById(
  //   "layer-select",
  // ) as HTMLSelectElement;

  // const selectNewLayer = (event: Event) => {
  //   const selectedLayer = (event.target as HTMLSelectElement).value;
  //   console.log(`Layer selected: ${selectedLayer}`);

  //   if (selectElement) {
  //     ctx.changeViewGraph(selectedLayer);
  //   }
  // };

  // layerSelect.onchange = selectNewLayer;

  document.body.onkeyup = function (e) {
    if (e.key === " " || e.code === "Space") {
      triggerPause();
      e.preventDefault();
    }
  };

  // TODO: load from local storage directly, without first generating a context
  loadFromLocalStorage(ctx);

  console.log("initialized!");
})();
