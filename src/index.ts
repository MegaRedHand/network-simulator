import { Application, Assets } from "pixi.js";

import {
  AddDevice,
  loadFromFile,
  loadFromLocalStorage,
  saveToFile,
} from "./types/viewportManager";
import { DataGraph } from "./types/graphs/datagraph";
import { Packet } from "./types/packet";
import { DeviceType } from "./types/devices/device";
import { LeftBar } from "./graphics/left_bar";
import { RightBar } from "./graphics/right_bar";
import { Viewport } from "./graphics/viewport";
import { GlobalContext } from "./context";

// Assets
// Doing this includes the file in the build
import "./styles";
import RouterSvg from "./assets/router.svg";
import ComputerSvg from "./assets/pc.svg";
import PlaySvg from "./assets/play-icon.svg";
import PauseSvg from "./assets/pause-icon.svg";

// IIFE to avoid errors
(async () => {
  // Initialization
  const app = new Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
  });

  const canvasPlaceholder = document.getElementById("canvas");
  canvasPlaceholder.replaceWith(app.canvas);
  await Assets.load(RouterSvg);
  await Assets.load(ComputerSvg);

  // Context initialization
  const ctx = new GlobalContext();

  // Background container initialization
  const viewport = new Viewport(app.renderer.events);
  app.stage.addChild(viewport);

  // Get the layer’s menu
  const layerSelect = document.getElementById(
    "layer-select",
  ) as HTMLSelectElement;

  // Left bar logic
  const leftBar = LeftBar.getFrom(document);
  RightBar.getInstance();

  const addRouterButton = () =>
    leftBar.addButton(
      RouterSvg,
      () => AddDevice(ctx, DeviceType.Router),
      "Add Router",
    );

  const addHostButton = () =>
    leftBar.addButton(
      ComputerSvg,
      () => AddDevice(ctx, DeviceType.Host),
      "Add Host",
    );

  function setButtonsByLayer(layer: string) {
    leftBar.clear();

    const buttonConfig: Record<string, (() => void)[]> = {
      application: [addHostButton],
      transport: [addHostButton],
      network: [addRouterButton, addHostButton],
      link: [addRouterButton, addHostButton],
    };

    buttonConfig[layer]?.forEach((addButton) => addButton());
  }

  setButtonsByLayer(layerSelect.value);

  // Initialize Context
  ctx.initialize(viewport, layerSelect.value);

  // Ticker logic
  // app.ticker.add(() => { });
  const lBar = document.getElementById("left-bar");
  const rBar = document.getElementById("right-bar");
  const tBar = document.getElementById("top-bar");

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
  const selectNewLayer = (event: Event) => {
    const selectedLayer = (event.target as HTMLSelectElement).value;
    console.log(`Layer selected: ${selectedLayer}`);

    if (selectedLayer) {
      ctx.changeViewGraph(selectedLayer);
      // LeftBar is reset
      setButtonsByLayer(selectedLayer);
    }
  };

  layerSelect.onchange = selectNewLayer;

  document.body.onkeyup = function (e) {
    if (e.key === " " || e.code === "Space") {
      triggerPause();
      e.preventDefault();
    }
  };

  // TODO: load from local storage directly, without first generating a context
  loadFromLocalStorage(ctx, layerSelect.value);

  // Speed selector logic
  let speedMultiplier = 1; // Valor predeterminado del multiplicador de velocidad.

  const speedSelect = document.getElementById("speed-select");
  speedSelect?.addEventListener("change", (event) => {
    const selectElement = event.target as HTMLSelectElement;
    speedMultiplier = parseFloat(selectElement.value);
    console.log(`Velocidad actualizada: ${speedMultiplier}x`);

    // Si el multiplicador afecta a la animación de los paquetes
    Packet.setSpeedMultiplier(speedMultiplier);
  });

  console.log("initialized!");
})();
