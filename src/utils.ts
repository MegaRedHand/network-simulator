import { GraphicsContext } from "pixi.js";
import { DataGraph } from "./types/graphs/datagraph";
import {
  deselectElement,
  saveToFile,
  loadFromFile,
} from "./types/viewportManager";
import { GlobalContext } from "./context";
import { ConfigModal } from "./config";

export enum Colors {
  Violet = 0x4b0082,
  Burgundy = 0x6d071a, // Bordo
  Lightblue = 0x1e90ff,
  Green = 0x0000ff,
  Red = 0xff0000,
  White = 0xffffff,
  Black = 0x000000,
  Yellow = 0xffff00,
}

export function circleGraphicsContext(
  color: number,
  x: number,
  y: number,
  radius: number,
): GraphicsContext {
  const graphicsCtx = new GraphicsContext();
  graphicsCtx.circle(x, y, radius);
  graphicsCtx.fill(color);
  return graphicsCtx;
}

export enum ZIndexLevels {
  Device = 20,
  Edge = 15,
  Packet = 16,
  Label = 19,
}

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
export const triggerPrint = (ctx: GlobalContext) => {
  ctx.print(); // Print the current network
};

// Function to open the help modal
export const triggerHelp = (configModal: ConfigModal) => {
  deselectElement(); // Deselect any currently selected element
  configModal.open(); // Open the configuration/help modal
};
