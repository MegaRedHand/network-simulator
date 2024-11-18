import { Application, Assets } from "pixi.js";

import {
  AddPc,
  AddRouter,
  AddServer,
  loadFromFile,
  loadFromLocalStorage,
  saveToFile,
} from "./types/viewportManager";
import { DataGraph } from "./types/graphs/datagraph";
import { Packet } from "./types/packet";
import { LeftBar } from "./graphics/left_bar";
import { RightBar } from "./graphics/right_bar";
import { Viewport } from "./graphics/viewport";
import { GlobalContext } from "./context";

// Assets
// Doing this includes the file in the build
import "./style.css";
import RouterSvg from "./assets/router.svg";
import ServerSvg from "./assets/server.svg";
import ComputerSvg from "./assets/pc.svg";
import PlaySvg from "./assets/play-icon.svg";
import PauseSvg from "./assets/pause-icon.svg";

// > index.ts

// IIFE to avoid errors
(async () => {
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
  leftBar.addButton(RouterSvg, () => AddRouter(ctx), "Add Router");

  // Add server button
  leftBar.addButton(ServerSvg, () => AddServer(ctx), "Add Server");

  // Add PC button
  leftBar.addButton(ComputerSvg, () => AddPc(ctx), "Add PC");

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
