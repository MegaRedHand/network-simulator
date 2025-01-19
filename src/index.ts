import { Application, Assets } from "pixi.js";

import {
  addDevice,
  loadFromFile,
  saveToFile,
  urManager,
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
import UndoSvg from "./assets/left-curve-arrow.svg";
import RedoSvg from "./assets/right-curve-arrow.svg";
import { layerToName } from "./types/devices/utils";

const assets = [RouterSvg, ComputerSvg, PlaySvg, PauseSvg, UndoSvg, RedoSvg];

async function loadAssets(otherPromises: Promise<void>[]) {
  await Promise.all([...otherPromises, ...assets.map((as) => Assets.load(as))]);
}

// IIFE to avoid errors
(async () => {
  // Initialization
  const app = new Application();
  const appInitPromise = app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
  });
  await loadAssets([appInitPromise]);

  const canvasPlaceholder = document.getElementById("canvas");
  canvasPlaceholder.replaceWith(app.canvas);

  // Background container initialization
  const viewport = new Viewport(app.renderer.events);
  app.stage.addChild(viewport);

  // Context initialization
  const ctx = new GlobalContext(viewport);

  // Get the layer’s menu
  const layerSelect = document.getElementById(
    "layer-select",
  ) as HTMLSelectElement;

  layerSelect.value = layerToName(ctx.getCurrentLayer());

  // Initialize RightBar
  RightBar.getInstance();

  // Left bar logic
  const leftBar = LeftBar.getFrom(document, ctx);
  leftBar.setButtonsByLayer(layerSelect.value);

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

  // Undo button’s logic
  const undoButton = document.getElementById(
    "undo-button",
  ) as HTMLButtonElement;

  const undoIcon = document.createElement("img");
  undoIcon.src = UndoSvg;
  undoIcon.alt = "Undo Icon";
  undoButton.appendChild(undoIcon);

  console.log(undoIcon.style.filter);
  urManager.suscribe(() => {
    undoButton.disabled = !urManager.canUndo();
    undoIcon.style.opacity = urManager.canUndo() ? "1" : "0.5"; // Full opacity for active, reduced for inactive
  });

  const triggerUndo = () => {
    if (urManager.canUndo()) {
      urManager.undo(ctx.getViewGraph());
    }
  };

  undoButton.onclick = triggerUndo;

  // Redo button’s logic
  const redoButton = document.getElementById(
    "redo-button",
  ) as HTMLButtonElement;
  const redoIcon = document.createElement("img");
  redoIcon.src = RedoSvg;
  redoIcon.alt = "Redo Icon";
  redoButton.appendChild(redoIcon);

  urManager.suscribe(() => {
    redoButton.disabled = !urManager.canRedo();
    redoIcon.style.opacity = urManager.canRedo() ? "1" : "0.5"; // Full opacity for active, reduced for inactive
  });

  const triggerRedo = () => {
    if (urManager.canRedo()) {
      urManager.redo(ctx.getViewGraph());
    }
  };

  redoButton.onclick = triggerRedo;

  // Add keyboard shortcuts for Undo (Ctrl+Z) and Redo (Ctrl+Y)
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey) {
      switch (event.key) {
        case "z": // Ctrl+Z for Undo
          event.preventDefault(); // Prevent default browser action (like undo in text inputs)
          triggerUndo();
          break;
        case "y": // Ctrl+Y for Redo
          event.preventDefault(); // Prevent default browser action
          triggerRedo();
          break;
      }
    }
  });

  // Pause button’s logic
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
      leftBar.setButtonsByLayer(selectedLayer);
    }
  };

  layerSelect.onchange = selectNewLayer;

  document.body.onkeyup = function (e) {
    if (e.key === " " || e.code === "Space") {
      triggerPause();
      e.preventDefault();
    }
  };

  console.log("initialized!");
})();
