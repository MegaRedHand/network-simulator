import { Application, Assets } from "pixi.js";
import { LeftBar } from "./graphics/left_bar";
import { RightBar } from "./graphics/right_bar";
import { Viewport } from "./graphics/viewport";
import { GlobalContext } from "./context";
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
import {
  attachTooltip,
  TooltipManagersetGlobalContext,
} from "./graphics/renderables/tooltip_manager";
import { TOOLTIP_KEYS } from "./utils/constants/tooltips_constants";
import { ConfigMenu } from "./config_menu/config_menu";

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

  // Initialize tooltips
  TooltipManagersetGlobalContext(ctx);

  // Initialize UI components
  RightBar.getInstance();
  const leftBar = LeftBar.getFrom(document, ctx);

  // Initialize handlers
  new LayerHandler(ctx, leftBar);
  new ResponsiveHandler(app, viewport);
  new UndoRedoHandler(ctx);
  new PauseHandler(ctx);
  new SpeedControlHandler(ctx);

  const configMenu = new ConfigMenu(ctx);
  new ShortcutsManager(ctx, app);

  // Setup button event handlers
  const buttonActions: { id: string; action: () => void }[] = [
    { id: TOOLTIP_KEYS.NEW_BUTTON, action: () => triggerNew(ctx) },
    { id: TOOLTIP_KEYS.SAVE_BUTTON, action: () => triggerSave(ctx) },
    { id: TOOLTIP_KEYS.LOAD_BUTTON, action: () => triggerLoad(ctx) },
    { id: TOOLTIP_KEYS.PRINT_BUTTON, action: () => triggerPrint(app, ctx) },
    { id: TOOLTIP_KEYS.HELP_BUTTON, action: () => triggerHelp(configMenu) },
  ];

  buttonActions.forEach(({ id, action }) => {
    const button = document.getElementById(id);
    if (button) {
      button.onclick = action;
      attachTooltip(button, id);
    }
  });

  console.log("✅ Initialized!");
})();
