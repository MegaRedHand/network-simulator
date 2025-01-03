import { Application, Assets } from "pixi.js";

import {
  AddDevice,
  loadFromFile,
  loadFromLocalStorage,
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

  // Left bar logic
  const leftBar = LeftBar.getFrom(document);
  RightBar.getInstance();

  // Add router button
  leftBar.addButton(
    RouterSvg,
    () => AddDevice(ctx, DeviceType.Router),
    "Add Router",
  );

  // Add Host button
  leftBar.addButton(
    ComputerSvg,
    () => AddDevice(ctx, DeviceType.Host),
    "Add Host",
  );

  ctx.initialize(viewport);

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

  // Parte de otro intento para poder cambiar el color del icono
  // undoButton.innerHTML = UndoSvg;
  // const undoIcon = undoButton.querySelector("path") as SVGPathElement;

  const undoIcon = document.createElement("img");
  undoIcon.src = UndoSvg;
  undoIcon.alt = "Undo Icon";
  undoButton.appendChild(undoIcon);

  urManager.suscribe(() => {
    console.log("Entre a la funcion suscribe de undo");
    undoButton.disabled = !urManager.canUndo();
    console.log(`canUdo da ${urManager.canUndo()}`);
    // no funciona
    undoIcon.style.fill = urManager.canUndo() ? "#3a3a3a" : "#a09f9f";
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
    console.log("Entre a la funcion suscribe de undo");
    redoButton.disabled = !urManager.canRedo();
    console.log(`canRedo da ${urManager.canRedo()}`);
    // no funciona
    redoIcon.style.fill = urManager.canRedo() ? "#3a3a3a" : "#a09f9f";
  });

  const triggerRedo = () => {
    if (urManager.canRedo()) {
      urManager.redo(ctx.getViewGraph());
    }
  };

  redoButton.onclick = triggerRedo;

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
  const layerSelect = document.getElementById(
    "layer-select",
  ) as HTMLSelectElement;

  const selectNewLayer = (event: Event) => {
    const selectedLayer = (event.target as HTMLSelectElement).value;
    console.log(`Layer selected: ${selectedLayer}`);

    if (selectedLayer) {
      ctx.changeViewGraph(selectedLayer);
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
  loadFromLocalStorage(ctx);

  console.log("initialized!");
})();
