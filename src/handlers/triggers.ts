import { GlobalContext } from "../context";
import { Application } from "pixi.js";
import {
  deselectElement,
  saveToFile,
  loadFromFile,
} from "../types/viewportManager";
import { captureAndDownloadViewport } from "../utils/utils";
import { DataGraph } from "../types/graphs/datagraph";
import { ConfigMenu } from "../config_menu/config_menu";

// Function to create a new network
export const triggerNew = (ctx: GlobalContext) => {
  deselectElement(); // Deselect any currently selected element
  ctx.load(new DataGraph(ctx)); // Load a new empty DataGraph into the context
  ctx.centerView(); // Center the view on the new network
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
export const triggerHelp = (configMenu: ConfigMenu) => {
  deselectElement(); // Deselect any currently selected element
  configMenu.open(); // Open the configuration/help modal
};
