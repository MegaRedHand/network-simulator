import { Application, GraphicsContext, RenderTexture } from "pixi.js";
import { Viewport } from "../graphics/viewport";
import { ALERT_MESSAGES } from "./constants/alert_constants";
import { showError } from "../graphics/renderables/alert_manager";

export enum Colors {
  Violet = 0x4b0082,
  Burgundy = 0x6d071a, // Bordo
  Lightblue = 0x1e90ff,
  Green = 0x0000ff,
  Red = 0xff0000,
  White = 0xffffff,
  Black = 0x000000,
  Yellow = 0xffff00,
  Grey = 0x5e5e5e,
  Hazel = 0xd99802,
}

export function circleGraphicsContext(
  color: number,
  radius: number,
): GraphicsContext {
  const x = 0;
  const y = 0;

  const graphicsCtx = new GraphicsContext();
  // Draw a circle
  graphicsCtx.circle(x, y, radius);
  graphicsCtx.fill(color);

  // Draw a bigger invisible hit-area
  graphicsCtx.circle(x, y, radius * 2);
  graphicsCtx.fill({ alpha: 0 });
  return graphicsCtx;
}

export enum ZIndexLevels {
  Device = 20,
  Edge = 15,
  Packet = 16,
  Label = 19,
}
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
      showError(ALERT_MESSAGES.FAILED_TO_GENERATE_IMAGE);
      return;
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "viewport-snapshot.png";
    link.click();
  }, "image/png");
}
