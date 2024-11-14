import { Graphics } from "pixi.js";

export enum Colors {
  Violet = 0x4b0082,
  Burgundy = 0x6d071a, // Bordo
  Lightblue = 0x1e90ff,
  Green = 0x0000ff,
  Red = 0xff0000,
  White = 0xffffff,
  Black = 0x000000,
}

export function drawCircle(
  graphics: Graphics,
  color: number,
  x: number,
  y: number,
  radius: number,
) {
  graphics.clear();
  graphics.circle(x, y, radius);
  graphics.fill(color);
  graphics.zIndex = ZIndexLevels.Packet;
}

export enum ZIndexLevels {
  Device = 20,
  Edge = 15,
  Packet = 16,
  Label = 19,
}
