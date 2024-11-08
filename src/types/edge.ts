import { Graphics } from "pixi.js";

export interface Position {
  x: number;
  y: number;
}

export class Edge extends Graphics {
  id: number;
  connectedNodes: { n1: number; n2: number };
  startPos: Position;
  endPos: Position;

  nodePosition(nodeId: number): Position | undefined {
    return this.connectedNodes.n1 === nodeId
      ? this.startPos
      : this.connectedNodes.n2 === nodeId
        ? this.endPos
        : undefined;
  }

  otherEnd(nodeId: number): number | undefined {
    return this.connectedNodes.n1 === nodeId
      ? this.connectedNodes.n2
      : this.connectedNodes.n2 === nodeId
        ? this.connectedNodes.n1
        : undefined;
  }
}
