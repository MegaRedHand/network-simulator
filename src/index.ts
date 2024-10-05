import {
  Application,
  Sprite,
  Assets,
  Graphics,
  GraphicsContext,
  FederatedPointerEvent,
} from "pixi.js";
import Bunny from "./bunny.png";
import Router from "./router.png";
import Server from "./server.png";
import Computer from "./computer.png";
import "./style.css";

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

  await Assets.load(Router);
  await Assets.load(Server);
  await Assets.load(Computer);

  const resizeRouterOption = () => {
    // Setup the position of the routerOption
    routerOption.x = app.renderer.width / 100;
    routerOption.y = app.renderer.height / 100;
    routerOption.width = routerOption.width / 10;
    routerOption.height = routerOption.height / 10;
  };

  const resizeServerOption = () => {
    // Setup the position of the serverOption
    serverOption.x = app.renderer.width / 100;
    serverOption.y = app.renderer.height / 10;
    serverOption.width = serverOption.width / 10;
    serverOption.height = serverOption.height / 10;
  };

  const resizeComputerOption = () => {
    // Setup the position of the computerOption
    computerOption.x = app.renderer.width / 100;
    computerOption.y = app.renderer.height / 5;
    computerOption.width = computerOption.width / 10;
    computerOption.height = computerOption.height / 10;
  };

  const routerOption = Sprite.from(Router);
  const serverOption = Sprite.from(Server);
  const computerOption = Sprite.from(Computer);

  resizeRouterOption();
  resizeServerOption();
  resizeComputerOption();

  const resizeElement = (element: Sprite) => {
    // Setup the size of the new element
    element.width = element.width / 10;
    element.height = element.height / 10;
  };

  let rect = new Graphics()
    .rect(0, 0, app.renderer.width, app.renderer.height)
    .fill("#ede7f0");

  const resizeRect = () => {
    rect.width = app.renderer.width;
    rect.height = app.renderer.height;
  };

  // Add the objects to the scene we are building
  app.stage.addChild(rect);
  rect.addChild(routerOption);
  rect.addChild(serverOption);
  rect.addChild(computerOption);

  var currElement = "router";

  let lineStart: { x: number; y: number } = null;

  const elementOnClick = (e: FederatedPointerEvent, router: Sprite) => {
    console.log("clicked on router", e);
    if (!e.altKey) {
      return;
    }
    e.stopPropagation();
    if (lineStart === null) {
      lineStart = { x: router.x, y: router.y };
    } else {
      const line = new Graphics()
        .moveTo(lineStart.x, lineStart.y)
        .lineTo(router.x, router.y)
        .stroke({ width: 5, color: "#3e3e3e" });
      rect.addChildAt(line, 0);
      lineStart = null;
    }
  };

  rect.on("click", (e) => {
    console.log("clicked on rect", e);
    if (
      !e.altKey &&
      e.globalX !== routerOption.x &&
      e.globalY !== routerOption.y &&
      e.globalX !== serverOption.x &&
      e.globalY !== serverOption.y &&
      e.globalX !== computerOption.x &&
      e.globalY !== computerOption.y
    ) {
      let element: Sprite;
      if (currElement === "router") {
        element = Sprite.from(Router);
      } else if (currElement === "server") {
        element = Sprite.from(Server);
      } else {
        element = Sprite.from(Computer);
      }
      resizeElement(element);
      element.anchor.x = 0.5;
      element.anchor.y = 0.5;
      element.x = e.globalX;
      element.y = e.globalY;
      rect.addChild(element);
      element.on("click", (e) => elementOnClick(e, element));
      element.eventMode = "static";
    }
  });

  routerOption.on("click", (e) => {
    currElement = "router";
  });

  serverOption.on("click", (e) => {
    currElement = "server";
  });

  computerOption.on("click", (e) => {
    currElement = "computer";
  });

  rect.eventMode = "static";
  routerOption.eventMode = "static";
  serverOption.eventMode = "static";
  computerOption.eventMode = "static";

  // Listen for frame updates
  //   app.ticker.add(() => {
  //     // each frame we spin the bunny around a bit
  //     bunny.rotation += 0.005;
  //   });

  function resize() {
    // Resize the renderer
    app.renderer.resize(window.innerWidth, window.innerHeight);

    resizeRouterOption();
    resizeServerOption();
    resizeComputerOption();
    resizeRect();
  }

  window.addEventListener("resize", resize);

  //   input.onchange = () => {
  //     const file = input.files[0];

  //     console.log(file);
  //     // setting up the reader
  //     const reader = new FileReader();
  //     reader.readAsDataURL(file); // this is reading as data url

  //     // here we tell the reader what to do when it's done reading...
  //     reader.onload = async (readerEvent) => {
  //       fileContent = readerEvent.target.result; // this is the content!
  //       const txt = await Assets.load(fileContent);
  //       bunny.texture = txt;
  //     };
  //   };
})();
