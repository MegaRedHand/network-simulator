import {
  Application,
  GraphicsContext,
  RenderTexture,
  Container,
  TextStyle,
  Text,
} from "pixi.js";
import { Viewport } from "../graphics/viewport";
import { ALERT_MESSAGES } from "./constants/alert_constants";
import { showError } from "../graphics/renderables/alert_manager";

export enum Colors {
  Violet = 0x4b0082,
  Burgundy = 0x6d071a, // Bordo
  Lightblue = 0x1e90ff,
  Green = 0x00ff00,
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

export function blockPointerEvents(obj: Container) {
  obj.on("pointerdown", (e) => e.stopPropagation());
  obj.on("pointerup", (e) => e.stopPropagation());
  obj.on("pointerupoutside", (e) => e.stopPropagation());
  obj.on("pointertap", (e) => e.stopPropagation());
  obj.on("pointermove", (e) => e.stopPropagation());
  obj.on("click", (e) => e.stopPropagation());
}

/**
 * Creates a PixiJS emoji icon centered above the device.
 * @param emoji The emoji or text to display (e.g., "🌐")
 * @param yOffset Vertical offset from the center of the device (e.g., -this.height / 2 - 5)
 * @param fontSize Font size (optional, default 20)
 * @returns A Pixi.Text instance ready to be added as a child
 */
export function createDeviceIcon(
  emoji: string,
  yOffset: number,
  fontSize = 20,
): Text {
  const textStyle = new TextStyle({
    fontSize,
  });

  const icon = new Text({ text: emoji, style: textStyle });
  icon.anchor.set(0.5, 1);
  icon.x = 1;
  icon.y = yOffset;
  icon.zIndex = 100;
  icon.eventMode = "static";
  icon.interactive = true;
  icon.cursor = "pointer";

  blockPointerEvents(icon);
  return icon;
}

/**
 * Changes the emoji/text of a PixiJS Text icon.
 * @param icon The Pixi.Text instance.
 * @param emoji The emoji or text to display.
 */
export function setIconEmoji(icon: Text, emoji: string) {
  icon.text = emoji;
}
