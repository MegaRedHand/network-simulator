import { Application, Assets } from "pixi.js";
import {
  deselectElement,
  saveToLocalStorage,
  urManager,
} from "./types/viewportManager";
import { Packet } from "./types/packet";
import { LeftBar } from "./graphics/left_bar";
import { RightBar } from "./graphics/right_bar";
import { Viewport } from "./graphics/viewport";
import { GlobalContext } from "./context";
import {
  triggerNew,
  triggerSave,
  triggerLoad,
  triggerPrint,
  triggerHelp,
} from "./utils";
import { ConfigModal } from "./config";

// Assets
import "./styles";
import RouterSvg from "./assets/router.svg";
import SwitchSvg from "./assets/switch.svg";
import ComputerSvg from "./assets/pc.svg";
import PlaySvg from "./assets/play-icon.svg";
import PauseSvg from "./assets/pause-icon.svg";
import UndoSvg from "./assets/left-curve-arrow.svg";
import RedoSvg from "./assets/right-curve-arrow.svg";
import { layerToName } from "./types/layer";

const assets = [
  RouterSvg,
  ComputerSvg,
  PlaySvg,
  PauseSvg,
  UndoSvg,
  RedoSvg,
  SwitchSvg,
];

async function loadAssets(otherPromises: Promise<void>[]) {
  await Promise.all([...otherPromises, ...assets.map((as) => Assets.load(as))]);
}

// IIFE to avoid errors
(async () => {
  const canvasPlaceholder = document.getElementById("canvas");
  const lBar = document.getElementById("left-bar");
  const rBar = document.getElementById("right-bar");
  const tBar = document.getElementById("top-bar");

  const app = new Application();
  const appInitPromise = app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
  });

  await loadAssets([appInitPromise]);
  canvasPlaceholder.replaceWith(app.canvas);

  const viewport = new Viewport(app.renderer.events);
  app.stage.addChild(viewport);

  const ctx = new GlobalContext(viewport);

  const layerSelect = document.getElementById(
    "layer-select",
  ) as HTMLSelectElement;
  layerSelect.value = layerToName(ctx.getCurrentLayer());

  RightBar.getInstance();

  const leftBar = LeftBar.getFrom(document, ctx);
  leftBar.setButtonsByLayer(layerSelect.value);

  function resize() {
    // Check if the layout should be stacked (based on window width)
    const isStacked = window.innerWidth <= 768;

    // Determine the size of the left bar (width if not stacked, height if stacked)
    const leftSize = isStacked
      ? lBar?.offsetHeight || 0
      : lBar?.offsetWidth || 0;

    // Determine the size of the right bar (width if not stacked, height if stacked)
    const rightSize = isStacked
      ? rBar?.offsetHeight || 0
      : rBar?.offsetWidth || 0;

    // Get the height of the top bar
    const topHeight = tBar?.offsetHeight || 0;

    // Calculate the new width and height for the canvas
    // If stacked, reduce height by left and right sizes; otherwise, reduce width
    let newWidth = window.innerWidth - (isStacked ? 0 : leftSize + rightSize);
    let newHeight =
      window.innerHeight - (isStacked ? leftSize + rightSize : topHeight);

    // Ensure minimum dimensions to prevent the canvas from becoming too small
    newWidth = Math.max(300, newWidth);
    newHeight = Math.max(200, newHeight);

    // Log the new dimensions for debugging
    console.log("📏 Resizing canvas to:", newWidth, "x", newHeight);

    // Resize the app renderer and viewport accordingly
    app.renderer.resize(newWidth, newHeight);
    viewport.resize(newWidth, newHeight);
  }

  resize();
  window.addEventListener("resize", resize);

  const newButton = document.getElementById("new-button");
  const loadButton = document.getElementById("load-button");
  const saveButton = document.getElementById("save-button");
  const printButton = document.getElementById("print-button");
  const helpButton = document.getElementById("help-button");

  const configModal = new ConfigModal(ctx);
  newButton.onclick = () => triggerNew(ctx);
  saveButton.onclick = () => triggerSave(ctx);
  loadButton.onclick = () => triggerLoad(ctx);
  printButton.onclick = () => triggerPrint(app, ctx);
  helpButton.onclick = () => triggerHelp(configModal);
  // Undo button’s logic
  const undoButton = document.getElementById(
    "undo-button",
  ) as HTMLButtonElement;

  const undoIcon = document.createElement("img");
  undoIcon.src = UndoSvg;
  undoIcon.alt = "Undo Icon";
  undoButton.appendChild(undoIcon);

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

  // Add keyboard shortcuts
  document.addEventListener("keydown", (event) => {
    // Check if the user is typing in an input or textarea
    const activeElement = document.activeElement as HTMLElement;
    if (
      activeElement &&
      (activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement.isContentEditable)
    ) {
      return; // Prevent shortcuts from executing while typing
    }

    // Handle Ctrl key combinations
    if (event.ctrlKey) {
      switch (event.key) {
        case "Z": // Ctrl+Shift+Z for Redo
          event.preventDefault(); // Prevent default browser action (e.g., undo in text inputs)
          triggerRedo();
          break;
        case "z": // Ctrl+Z for Undo
          event.preventDefault(); // Prevent default browser action
          triggerUndo();
          break;
        case "y": // Ctrl+Y for Redo
          event.preventDefault(); // Prevent default browser action
          triggerRedo();
          break;
      }
    } else {
      // Handle single key shortcuts
      switch (event.key.toLowerCase()) {
        case "n": // Create a new network
          event.preventDefault();
          triggerNew(ctx);
          break;
        case "s": // Save the network
          event.preventDefault();
          triggerSave(ctx);
          break;
        case "l": // Load a network
          event.preventDefault();
          triggerLoad(ctx);
          break;
        case "p": // Print the network
          event.preventDefault();
          triggerPrint(app, ctx);
          break;
        case "h": // Open the Help modal
          event.preventDefault();
          triggerHelp(configModal);
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

    pauseButton.classList.toggle("paused");
    pauseButton.title = paused ? "Resume" : "Pause";

    pauseIcon.src = paused ? PlaySvg : PauseSvg;

    if (paused) {
      Packet.pauseAnimation();
    } else {
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

  function updateSpeedWheel(value: number) {
    const speedWheel = document.getElementById(
      "speed-wheel",
    ) as HTMLInputElement;
    const valueDisplay = document.querySelector(".value-display");

    speedWheel.value = value.toString();
    valueDisplay.textContent = `${value}x`;
  }

  // For layer abstraction logic
  const selectNewLayer = (event: Event) => {
    const selectedLayer = (event.target as HTMLSelectElement).value;
    console.log(`Layer selected: ${selectedLayer}`);

    if (selectedLayer) {
      ctx.changeViewGraph(selectedLayer);
      saveToLocalStorage(ctx);
      // LeftBar is reset
      leftBar.setButtonsByLayer(selectedLayer);
      deselectElement(); // not needed
    }
  };

  layerSelect.onchange = selectNewLayer;
  layerSelect.addEventListener("layerChanged", () => {
    const currLayer = layerToName(ctx.getCurrentLayer());
    layerSelect.value = currLayer;
    leftBar.setButtonsByLayer(currLayer);
  });

  const speedMultiplier = ctx.getCurrentSpeed();
  console.log("Current Speed Multiplier: ", speedMultiplier);

  const speedWheel = document.getElementById("speed-wheel") as HTMLInputElement;
  const valueDisplay = document.querySelector(".value-display");

  // Update the wheel with the current speed value
  updateSpeedWheel(speedMultiplier.value);

  speedWheel.addEventListener("input", (event) => {
    const value = parseFloat((event.target as HTMLInputElement).value);
    valueDisplay.textContent = `${value}x`;

    ctx.changeSpeedMultiplier(value);
  });

  // Initialize with default value
  valueDisplay.textContent = `${(speedWheel as HTMLInputElement).value}x`;

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

  console.log("✅ Initialized!");
})();
