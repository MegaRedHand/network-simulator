import {
  Texture,
  Point,
  Graphics,
  Sprite,
  FederatedPointerEvent,
} from "pixi.js";

import RouterImage from "../assets/router.svg";
import ServerImage from "../assets/server.svg";
import ComputerImage from "../assets/computer.svg";

export const DEVICE_SIZE = 20;

interface LineGraphics extends Graphics {
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
}

export class Device {
  element: Sprite;
  stage: Graphics;
  dragging: boolean = false;
  connectedLines: { line: LineGraphics; start: boolean }[] = [];
  offsetX: number = 0;
  offsetY: number = 0;

  constructor(
    device: string | Texture,
    stage: Graphics,
    onClick: (e: FederatedPointerEvent, device: Device) => void,
    drag: boolean
  ) {
    this.element = Sprite.from(device);
    this.stage = stage;

    this.element.anchor.x = 0.5;
    this.element.anchor.y = 0.5;
    stage.addChild(this.element);
    this.resize();

    this.element.eventMode = "static";
    this.element.interactive = true;

    if (drag) {
      this.element.on("pointerdown", this.onPointerDown, this);
    }

    this.element.on("click", (e) => onClick(e, this));
  }

  resizeDevice(
    proportion_x: number,
    proportion_y: number,
    proportion_w: number,
    proportion_h: number
  ): void {
    // Setup the position of the serverOption
    this.element.x = this.stage.width / proportion_x;
    this.element.y = this.stage.height / proportion_y;
    this.element.width = this.stage.width / proportion_w;
    this.element.height = this.stage.height / proportion_h;
  }

  resize(): void {
    // Setup the size of the new element
    this.element.width = this.element.width / 70;
    this.element.height = this.element.height / DEVICE_SIZE;
  }

  onPointerDown(event: FederatedPointerEvent): void {
    this.dragging = true;

    // Calcula el desplazamiento entre el mouse y el elemento
    this.offsetX = event.clientX - this.element.x;
    this.offsetY = event.clientY - this.element.y;

    // Escucha los eventos globales de pointermove y pointerup
    document.addEventListener("pointermove", this.onPointerMove);
    document.addEventListener("pointerup", this.onPointerUp);
  }

  onPointerMove = (event: PointerEvent): void => {
    if (this.dragging) {
      // Calcula la nueva posición usando el desplazamiento
      const newPositionX = event.clientX - this.offsetX;
      const newPositionY = event.clientY - this.offsetY;
      this.element.x = newPositionX;
      this.element.y = newPositionY;

      // Actualiza las líneas conectadas
      this.updateLines();
    }
  };

  onPointerUp = (): void => {
    this.dragging = false;

    // Remueve los eventos globales de pointermove y pointerup
    document.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerup", this.onPointerUp);
  };

  onDragStart(event: FederatedPointerEvent): void {
    // Starts dragging functionality
    this.dragging = true;
  }

  onDragMove(event: FederatedPointerEvent): void {
    // Dargging functionality.
    if (this.dragging) {
      this.updateLines();
    }
  }

  onDragEnd(): void {
    // Finishes dargging functionality.
    this.dragging = false;
  }

  connectTo(other: Device): boolean {
    // If other is in the same stage than this, connnects both
    // devices with a line. Returns true if connection
    // was established, false otherwise.
    if (this.stage === other.stage) {
      console.log("entro en connecTo");
      const line = new Graphics() as LineGraphics;
      line.moveTo(this.element.x, this.element.y);
      line.lineTo(other.element.x, other.element.y);
      line.stroke({ width: 2, color: 0x3e3e3e });

      // Store the start and end positions
      line.startPos = { x: this.element.x, y: this.element.y };
      line.endPos = { x: other.element.x, y: other.element.y };

      this.stage.addChild(line);

      // Save the line in both devices
      this.connectedLines.push({ line, start: true });
      other.connectedLines.push({ line, start: false });
      return true;
    }
    return false;
  }

  updateLines(): void {
    // Updates the positions of the device-linked
    // lines’s ends.
    this.connectedLines.forEach(({ line, start }) => {
      console.log("pasa por una linea");
      if (start) {
        line.startPos = { x: this.element.x, y: this.element.y };
      } else {
        line.endPos = { x: this.element.x, y: this.element.y };
      }
      line.clear();
      line.moveTo(line.startPos.x, line.startPos.y);
      line.lineTo(line.endPos.x, line.endPos.y);
      line.stroke({ width: 2, color: 0x3e3e3e }); // Redraw the line
    });
  }
}

export class Router extends Device {
  constructor(
    stage: Graphics,
    onClick: (e: FederatedPointerEvent, device: Device) => void,
    drag: boolean
  ) {
    super(RouterImage, stage, onClick, drag);
  }
}

export class Server extends Device {
  constructor(
    stage: Graphics,
    onClick: (e: FederatedPointerEvent, device: Device) => void,
    drag: boolean
  ) {
    super(ServerImage, stage, onClick, drag);
  }
}

export class Computer extends Device {
  constructor(
    stage: Graphics,
    onClick: (e: FederatedPointerEvent, device: Device) => void,
    drag: boolean
  ) {
    super(ComputerImage, stage, onClick, drag);
  }
}
