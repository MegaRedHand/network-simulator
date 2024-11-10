import { Graphics } from "pixi.js";

export enum Colors {
  Violet = 0x4b0082,
  Burgundy = 0x6d071a, // Bordo
  Lightblue = 0x1e90ff,
  Green = 0x0000ff,
  Red = 0xff0000,
  White = 0xffffff,
}

export function drawCircle(
  graphics: Graphics,
  color: number,
  x: number,
  y: number,
  radius: number,
) {
  graphics.clear();
  graphics.beginFill(color);
  graphics.drawCircle(x, y, radius);
  graphics.endFill();
}
