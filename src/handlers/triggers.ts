import { GlobalContext } from "../context";
import { Application } from "pixi.js";
import { deselectElement } from "../types/viewportManager";
import { captureAndDownloadViewport } from "../utils/utils";
import { DataGraph } from "../types/graphs/datagraph";

// Function to create a new network
export const triggerNew = (ctx: GlobalContext) => {
  deselectElement(); // Deselect any currently selected element
  ctx.load(new DataGraph(ctx)); // Load a new empty DataGraph into the context
  ctx.centerView(); // Center the view on the new network
};

// Function to save the network
export const triggerSave = (ctx: GlobalContext) => {
  deselectElement(); // Deselect any currently selected element
  ctx.saveToFile(); // Save the current network to a file
};

// Function to load a network from a file
export const triggerLoad = (ctx: GlobalContext) => {
  deselectElement(); // Deselect any currently selected element
  ctx.loadFromFile(); // Load a network from a file into the context
};

// Function to print the network
export const triggerPrint = (app: Application, ctx: GlobalContext) => {
  captureAndDownloadViewport(app, ctx.getViewport());
  ctx.print(); // Print the current network
};

// Function to open the help modal
export const triggerHelp = (ctx: GlobalContext) => {
  deselectElement(); // Deselect any currently selected element
  ctx.getConfigMenu().open(); // Open the configuration/help modal
};
