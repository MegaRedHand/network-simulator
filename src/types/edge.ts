import { Graphics } from "pixi.js";

export interface Edge extends Graphics {
  id: number;
  connectedNodes: { n1: number; n2: number };
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
}
