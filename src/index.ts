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

const DISPOSITIVE_SIZE = 20;
// const WORLD_HEIGHT = 10000;

interface LineGraphics extends Graphics {
  startPos?: { x: number; y: number };
  endPos?: { x: number; y: number };
}

enum DispositiveEnum {
  Router,
  Server,
  Computer,
}

class Dispositive {
  element: Sprite;
  stage: Graphics;
  dragging: boolean = false;
  connectedLines: { line: LineGraphics; start: boolean }[] = [];
  offsetX: number = 0;
  offsetY: number = 0;

  constructor(
    dispositive: string | Texture,
    stage: Graphics,
    onClick: (e: FederatedPointerEvent, dispositive: Dispositive) => void,
    drag: boolean
  ) {
    this.element = Sprite.from(dispositive);
    this.stage = stage;

    this.element.anchor.x = 0.5;
    this.element.anchor.y = 0.5;
    stage.addChild(this.element);
    this.resize();

    this.element.eventMode = "static";
    this.element.interactive = true;

    if (drag) {
      // this.element.on("pointerdown", handlePointerDown(this));
      this.element.on("pointerdown", this.onPointerDown, this);
      // this.element.on("mousedown", this.onDragStart, this);
      // this.element.on("mouseup", this.onDragEnd, this);
      // this.element.on("mouseupoutside", this.onDragEnd, this);
      // this.element.on("mousemove", this.onDragMove, this);
    }

    this.element.on("click", (e) => onClick(e, this));
  }

  resizeDispositive(
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
    this.element.height = this.element.height / DISPOSITIVE_SIZE;
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
    // this.offset = {
    //   x: event.clientX - this.element.x,
    //   y: event.clientY - this.element.y,
    // };
    // this.element.x = event.globalX;
    // this.element.y = event.globalY;
  }

  onDragMove(event: FederatedPointerEvent): void {
    // Dargging functionality.
    if (this.dragging) {
      // const newPosition = {
      //   x: event.clientX - this.offset.x,
      //   y: event.clientY - this.offset.y,
      // };

      // Calculate the delta (difference in position)
      // const deltaX = newPosition.x - this.element.x;
      // const deltaY = newPosition.y - this.element.y;

      // this.element.x = newPosition.x;
      // this.element.y = newPosition.y;

      // Update the lines connected to this dispositive
      this.updateLines();
    }
  }

  onDragEnd(): void {
    // Finishes dargging functionality.
    this.dragging = false;
  }

  connectTo(other: Dispositive): boolean {
    // If other is in the same stage than this, connnects both
    // dispositives with a line. Returns true if connection
    // was established, false otherwise.
    if (this.stage === other.stage) {
      console.log("entro en connecTo");
      const line = new Graphics() as LineGraphics;
      line.moveTo(this.element.x, this.element.y);
      line.lineTo(other.element.x, other.element.y);
      line.stroke({ width: 1, color: 0x3e3e3e });

      // Store the start and end positions
      line.startPos = { x: this.element.x, y: this.element.y };
      line.endPos = { x: other.element.x, y: other.element.y };

      this.stage.addChild(line);

      // Save the line in both dispositives
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
        // Update the starting point of the line
        line.startPos = { x: this.element.x, y: this.element.y };
      } else {
        // Update the ending point of the line
        line.endPos = { x: this.element.x, y: this.element.y };
      }
      line.clear();
      line.stroke({ width: 1, color: 0x3e3e3e }); // Redraw the line
      line.moveTo(line.startPos.x, line.startPos.y);
      line.lineTo(line.endPos.x, line.endPos.y);
    });
  }
}

class Router extends Dispositive {
  constructor(
    stage: Graphics,
    onClick: (e: FederatedPointerEvent, dispositive: Dispositive) => void,
    drag: boolean
  ) {
    super(RouterImage, stage, onClick, drag);
  }
}

class Server extends Dispositive {
  constructor(
    stage: Graphics,
    onClick: (e: FederatedPointerEvent, dispositive: Dispositive) => void,
    drag: boolean
  ) {
    super(ServerImage, stage, onClick, drag);
  }
}

class Computer extends Dispositive {
  constructor(
    stage: Graphics,
    onClick: (e: FederatedPointerEvent, dispositive: Dispositive) => void,
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

  const optionOnClick = (
    e: FederatedPointerEvent,
    dispositive: Dispositive
  ) => {
    const newDispositive = new Dispositive(
      dispositive.element.texture,
      dispositive.stage,
      dispositiveOnClick,
      true
    );
    newDispositive.resizeDispositive(
      2,
      2,
      DISPOSITIVE_SIZE + 15,
      DISPOSITIVE_SIZE
    );
  };

  const routerOption = new Router(rect, optionOnClick, false);
  routerOption.resizeDispositive(
    40,
    20,
    DISPOSITIVE_SIZE + 15,
    DISPOSITIVE_SIZE
  );
  const serverOption = new Server(rect, optionOnClick, false);
  serverOption.resizeDispositive(
    40,
    8,
    DISPOSITIVE_SIZE + 15,
    DISPOSITIVE_SIZE
  );
  const computerOption = new Computer(rect, optionOnClick, false);
  computerOption.resizeDispositive(
    40,
    5,
    DISPOSITIVE_SIZE + 15,
    DISPOSITIVE_SIZE
  );

  let lineStart: Dispositive = null;

  const dispositiveOnClick = (
    e: FederatedPointerEvent,
    dispositive: Dispositive
  ) => {
    console.log("clicked on dispositive", e);
    if (!e.altKey) {
      return;
    }
    e.stopPropagation();
    if (lineStart === null) {
      lineStart = dispositive;
    } else {
      if (lineStart.connectTo(dispositive)) {
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
    routerOption.resizeDispositive(
      40,
      20,
      DISPOSITIVE_SIZE + 15,
      DISPOSITIVE_SIZE
    );
    serverOption.resizeDispositive(
      40,
      8,
      DISPOSITIVE_SIZE + 15,
      DISPOSITIVE_SIZE
    );
    computerOption.resizeDispositive(
      40,
      5,
      DISPOSITIVE_SIZE + 15,
      DISPOSITIVE_SIZE
    );
  }

  window.addEventListener("resize", resize);
})();
