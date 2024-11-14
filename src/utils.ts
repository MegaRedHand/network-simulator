import { GraphicsContext } from "pixi.js";

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
