import {
  Application,
  Sprite,
  Assets,
  Graphics,
  GraphicsContext,
  FederatedPointerEvent,
  Texture,
  Point,
} from "pixi.js";
import RouterImage from "./assets/router.svg";
import ServerImage from "./assets/server.svg";
import ComputerImage from "./assets/computer.svg";
import "./style.css";

const DEVICE_SIZE = 20;

interface LineGraphics extends Graphics {
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
}

class Device {
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

class Router extends Device {
  constructor(
    stage: Graphics,
    onClick: (e: FederatedPointerEvent, device: Device) => void,
    drag: boolean
  ) {
    super(RouterImage, stage, onClick, drag);
  }
}

class Server extends Device {
  constructor(
    stage: Graphics,
    onClick: (e: FederatedPointerEvent, device: Device) => void,
    drag: boolean
  ) {
    super(ServerImage, stage, onClick, drag);
  }
}

class Computer extends Device {
  constructor(
    stage: Graphics,
    onClick: (e: FederatedPointerEvent, device: Device) => void,
    drag: boolean
  ) {
    super(ComputerImage, stage, onClick, drag);
  }
}

// IIFE to avoid errors
(async () => {
  const button = document.createElement("button");
  button.textContent = "Open file";
  let fileContent = null;

  const input = document.createElement("input");
  input.type = "file";

  button.onclick = () => {
    input.click();
  };
  document.body.appendChild(button);

  // The application will create a renderer using WebGL, if possible,
  // with a fallback to a canvas render. It will also setup the ticker
  // and the root stage PIXI.Container
  const app = new Application();

  // Wait for the Renderer to be available
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: devicePixelRatio,
  });

  // The application will create a canvas element for you that you
  // can then insert into the DOM
  document.body.appendChild(app.canvas);

  await Assets.load(RouterImage);
  await Assets.load(ServerImage);
  await Assets.load(ComputerImage);

  // Add the objects to the scene we are building
  let rect = new Graphics()
    .rect(0, 0, app.renderer.width, app.renderer.height)
    .fill("#ede7f0");

  const resizeRect = () => {
    rect.width = app.renderer.width;
    rect.height = app.renderer.height;
  };

  app.stage.addChild(rect);

  const optionOnClick = (e: FederatedPointerEvent, device: Device) => {
    const newDevice = new Device(
      device.element.texture,
      device.stage,
      deviceOnClick,
      true
    );
    newDevice.resizeDevice(2, 2, DEVICE_SIZE + 15, DEVICE_SIZE);
  };

  const routerOption = new Router(rect, optionOnClick, false);
  routerOption.resizeDevice(40, 20, DEVICE_SIZE + 15, DEVICE_SIZE);
  const serverOption = new Server(rect, optionOnClick, false);
  serverOption.resizeDevice(40, 8, DEVICE_SIZE + 15, DEVICE_SIZE);
  const computerOption = new Computer(rect, optionOnClick, false);
  computerOption.resizeDevice(40, 5, DEVICE_SIZE + 15, DEVICE_SIZE);

  let lineStart: Device = null;

  const deviceOnClick = (e: FederatedPointerEvent, device: Device) => {
    console.log("clicked on device", e);
    if (!e.altKey) {
      return;
    }
    e.stopPropagation();
    if (lineStart === null) {
      lineStart = device;
    } else {
      if (lineStart.connectTo(device)) {
        lineStart = null;
      }
    }
  };

  rect.on("click", (e) => {
    console.log("clicked on rect", e);
  });

  rect.eventMode = "static";

  function resize() {
    // Resize the renderer
    app.renderer.resize(window.innerWidth, window.innerHeight);

    resizeRect();
    routerOption.resizeDevice(40, 20, DEVICE_SIZE + 15, DEVICE_SIZE);
    serverOption.resizeDevice(40, 8, DEVICE_SIZE + 15, DEVICE_SIZE);
    computerOption.resizeDevice(40, 5, DEVICE_SIZE + 15, DEVICE_SIZE);
  }

  window.addEventListener("resize", resize);
})();
