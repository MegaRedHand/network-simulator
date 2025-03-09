import { Application, GraphicsContext, RenderTexture } from "pixi.js";
import { DataGraph } from "./types/graphs/datagraph";
import {
  deselectElement,
  saveToFile,
  loadFromFile,
} from "./types/viewportManager";
import { GlobalContext } from "./context";
import { ConfigModal } from "./config";
import { Viewport } from "./graphics/viewport";

export enum Colors {
  Violet = 0x4b0082,
  Burgundy = 0x6d071a, // Bordo
  Lightblue = 0x1e90ff,
  Green = 0x0000ff,
  Red = 0xff0000,
  White = 0xffffff,
  Black = 0x000000,
  Yellow = 0xffff00,
}

export function circleGraphicsContext(
  color: number,
  x: number,
  y: number,
  radius: number,
): GraphicsContext {
  const graphicsCtx = new GraphicsContext();
  graphicsCtx.circle(x, y, radius);
  graphicsCtx.fill(color);
  return graphicsCtx;
}

export enum ZIndexLevels {
  Device = 20,
  Edge = 15,
  Packet = 16,
  Label = 19,
}

// Function to create a new network
export const triggerNew = (ctx: GlobalContext) => {
  deselectElement(); // Deselect any currently selected element
  ctx.load(new DataGraph()); // Load a new empty DataGraph into the context
};

// Function to save the network
export const triggerSave = (ctx: GlobalContext) => {
  deselectElement(); // Deselect any currently selected element
  saveToFile(ctx); // Save the current network to a file
};

// Function to load a network from a file
export const triggerLoad = (ctx: GlobalContext) => {
  deselectElement(); // Deselect any currently selected element
  loadFromFile(ctx); // Load a network from a file into the context
};

// Function to print the network
export const triggerPrint = (app: Application, ctx: GlobalContext) => {
  captureAndDownloadViewport(app, ctx.getViewport());
  ctx.print(); // Print the current network
};

// Function to open the help modal
export const triggerHelp = (configModal: ConfigModal) => {
  deselectElement(); // Deselect any currently selected element
  configModal.open(); // Open the configuration/help modal
};
/**
 * Captures the current viewport and downloads it as an image.
 * @param app - The PixiJS application instance.
 * @param viewport - The viewport instance to capture.
 */
export function captureAndDownloadViewport(
  app: Application,
  viewport: Viewport,
) {
  if (!viewport) {
    alert("Viewport not found.");
    return;
  }

  // Step 1: Create a texture and render the viewport into it
  const renderTexture = RenderTexture.create({
    width: app.renderer.width,
    height: app.renderer.height,
  });

  // Step 2: Render the viewport into the texture
  app.renderer.render({
    container: viewport,
    target: renderTexture,
  });

  // Step 3: Extract the RenderTexture as a canvas
  const extractedCanvas = app.renderer.extract.canvas(renderTexture);

  // Step 4: Convert the extracted canvas to a Blob and download it
  extractedCanvas.toBlob((blob) => {
    if (!blob) {
      alert("Failed to generate image.");
      return;
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "viewport-snapshot.png";
    link.click();
  }, "image/png");
}
