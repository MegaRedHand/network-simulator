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
import { Computer, Device, DEVICE_SIZE, Router, Server } from "./device/device";
import { optionOnClick } from "./utils";

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

  const routerOption = new Router(rect, optionOnClick, false);
  routerOption.resizeDevice(40, 20, DEVICE_SIZE + 15, DEVICE_SIZE);
  const serverOption = new Server(rect, optionOnClick, false);
  serverOption.resizeDevice(40, 8, DEVICE_SIZE + 15, DEVICE_SIZE);
  const computerOption = new Computer(rect, optionOnClick, false);
  computerOption.resizeDevice(40, 5, DEVICE_SIZE + 15, DEVICE_SIZE);

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
