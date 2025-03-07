import { GraphicsContext } from "pixi.js";
import { DataGraph } from "./types/graphs/datagraph";
import {
  deselectElement,
  saveToFile,
  loadFromFile,
} from "./types/viewportManager";
import { GlobalContext } from "./context";

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

// Función para crear una nueva red
export const triggerNew = (ctx: GlobalContext) => {
  deselectElement();
  ctx.load(new DataGraph());
};

// Función para guardar la red
export const triggerSave = (ctx: GlobalContext) => {
  deselectElement();
  saveToFile(ctx);
};

// Función para cargar una red desde un archivo
export const triggerLoad = (ctx: GlobalContext) => {
  deselectElement();
  loadFromFile(ctx);
};

// Función para imprimir la red
export const triggerPrint = (ctx: GlobalContext) => {
  ctx.print();
};

// Función para abrir la ayuda
export const triggerHelp = () => {
  alert(
    "GEduNet - Keyboard Shortcuts \n\n" +
      "🔹 General Controls:\n" +
      "[C] - Connect devices\n" +
      "[H] - Open Help\n" +
      "[Delete] or [Backspace] - Delete selected element\n" +
      "[Space] - Pause/resume simulation\n\n" +
      "🔹 Undo/Redo:\n" +
      "[Ctrl + Z] - Undo last action\n" +
      "[Ctrl + Y] - Redo last undone action\n" +
      "[Ctrl + Shift + Z] - Alternative Redo\n\n" +
      "🔹 Network Management:\n" +
      "[N] - Create a new network\n" +
      "[S] - Save your network\n" +
      "[L] - Load a saved network\n" +
      "[P] - Print the current network\n\n",
  );
};
