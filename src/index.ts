import { Application, Assets } from "pixi.js";
import { LeftBar } from "./graphics/left_bar";
import { RightBar } from "./graphics/right_bar";
import { Viewport } from "./graphics/viewport";
import { GlobalContext } from "./context";
import { ConfigModal } from "./config";
import { ShortcutsManager } from "./handlers/shortcuts";
import { ResponsiveHandler } from "./handlers/responsiveHandler";
import { SpeedControlHandler } from "./handlers/speedControlHandler";
import { UndoRedoHandler } from "./handlers/undoRedoHandler";
import { PauseHandler } from "./handlers/pauseHandler";
import { LayerHandler } from "./handlers/layerSelectorHandler";

// Assets
import "./styles";
import RouterSvg from "./assets/router.svg";
import SwitchSvg from "./assets/switch.svg";
import ComputerSvg from "./assets/pc.svg";
import PlaySvg from "./assets/play-icon.svg";
import PauseSvg from "./assets/pause-icon.svg";
import UndoSvg from "./assets/left-curve-arrow.svg";
import RedoSvg from "./assets/right-curve-arrow.svg";

import {
  triggerHelp,
  triggerLoad,
  triggerNew,
  triggerPrint,
  triggerSave,
} from "./handlers/triggers";
import { TooltipManager } from "./graphics/renderables/tooltip_manager";

const assets = [
  RouterSvg,
  ComputerSvg,
  PlaySvg,
  PauseSvg,
  UndoSvg,
  RedoSvg,
  SwitchSvg,
];

async function loadAssets(otherPromises: Promise<void>[]) {
  await Promise.all([...otherPromises, ...assets.map((as) => Assets.load(as))]);
}

// IIFE to avoid errors
(async () => {
  const canvasPlaceholder = document.getElementById("canvas");

  // Initialize application
  const app = new Application();
  const appInitPromise = app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
  });

  await loadAssets([appInitPromise]);
  canvasPlaceholder.replaceWith(app.canvas);

  // Initialize viewport and global context
  const viewport = new Viewport(app.renderer.events);
  app.stage.addChild(viewport);
  const ctx = new GlobalContext(viewport);

  // Initialize UI components
  RightBar.getInstance();
  const leftBar = LeftBar.getFrom(document, ctx);

  // Initialize handlers
  new LayerHandler(ctx, leftBar);
  new ResponsiveHandler(app, viewport);
  new UndoRedoHandler(ctx);
  new PauseHandler();
  new SpeedControlHandler(ctx);

  const configModal = new ConfigModal(ctx);
  new ShortcutsManager(ctx, app);

  // Setup button event handlers
  const buttonActions: { id: string; action: () => void }[] = [
    { id: "new-button", action: () => triggerNew(ctx) },
    { id: "save-button", action: () => triggerSave(ctx) },
    { id: "load-button", action: () => triggerLoad(ctx) },
    { id: "print-button", action: () => triggerPrint(app, ctx) },
    { id: "help-button", action: () => triggerHelp(configModal) },
  ];

  buttonActions.forEach(({ id, action }) => {
    const button = document.getElementById(id);
    if (button) button.onclick = action;
  });

  // Initialize tooltips
  TooltipManager.getInstance().setGlobalContext(ctx);

  console.log("✅ Initialized!");
})();
