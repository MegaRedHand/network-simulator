import { GlobalContext } from "./context";
import { Application } from "pixi.js";
import {
  deselectElement,
  saveToFile,
  loadFromFile,
  urManager,
} from "./types/viewportManager";
import { captureAndDownloadViewport } from "./utils";
import { ConfigModal } from "./config";
import { Packet } from "./types/packet";
import { DataGraph } from "./types/graphs/datagraph";
import PlaySvg from "./assets/play-icon.svg";
import PauseSvg from "./assets/pause-icon.svg";

// Function to create a new network
export const triggerNew = (ctx: GlobalContext) => {
  deselectElement(); // Deselect any currently selected element
  ctx.load(new DataGraph()); // Load a new empty DataGraph into the context
};

// Function to save the network
export const triggerSave = (ctx: GlobalContext) => {
  deselectElement(); // Deselect any currently selected element
  saveToFile(ctx); // Save the current network to a file
};

// Function to load a network from a file
export const triggerLoad = (ctx: GlobalContext) => {
  deselectElement(); // Deselect any currently selected element
  loadFromFile(ctx); // Load a network from a file into the context
};

// Function to print the network
export const triggerPrint = (app: Application, ctx: GlobalContext) => {
  captureAndDownloadViewport(app, ctx.getViewport());
  ctx.print(); // Print the current network
};

// Function to open the help modal
export const triggerHelp = (configModal: ConfigModal) => {
  deselectElement(); // Deselect any currently selected element
  configModal.open(); // Open the configuration/help modal
};

// Function to trigger undo action
export const triggerUndo = (ctx: GlobalContext) => {
  if (urManager.canUndo()) {
    urManager.undo(ctx.getViewGraph());
  }
};

// Function to trigger redo action
export const triggerRedo = (ctx: GlobalContext) => {
  if (urManager.canRedo()) {
    urManager.redo(ctx.getViewGraph());
  }
};

// Function to toggle pause
export const triggerPause = (pauseIcon?: HTMLImageElement) => {
  const pauseButton = document.getElementById("pause-button");
  if (!pauseButton) return;

  let paused = pauseButton.classList.contains("paused");
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
