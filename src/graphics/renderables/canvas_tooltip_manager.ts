import { Text, TextStyle, Container } from "pixi.js";

/**
 * Displays a tooltip in a specific container.
 * @param container - The container where the tooltip will be displayed.
 * @param message - The message to display in the tooltip.
 * @param x - The X position of the tooltip.
 * @param y - The Y position of the tooltip.
 * @param existingTooltip - An existing tooltip (if already created).
 * @returns The updated or newly created tooltip.
 */
export function showTooltip(
  container: Container,
  message: string,
  x: number,
  y: number,
  existingTooltip: Text | null,
): Text {
  if (!existingTooltip) {
    const textStyle = new TextStyle({
      fontSize: 12,
      fill: 0x000000, // Black
      align: "center",
      fontWeight: "bold",
    });

    const tooltip = new Text({ text: message, style: textStyle });
    tooltip.anchor.set(0.5);
    container.addChild(tooltip);

    tooltip.x = x;
    tooltip.y = y;
    tooltip.visible = true;

    return tooltip;
  }

  // If the tooltip already exists, update its position and message
  existingTooltip.text = message;
  existingTooltip.x = x;
  existingTooltip.y = y;
  existingTooltip.visible = true;

  return existingTooltip;
}

/**
 * Hides an existing tooltip.
 * @param tooltip - The tooltip to hide.
 */
export function hideTooltip(tooltip: Text | null): void {
  if (tooltip) {
    tooltip.visible = false;
  }
}

/**
 * Removes a tooltip from the container and frees memory.
 * @param container - The container of the tooltip.
 * @param tooltip - The tooltip to remove.
 * @returns `null` to indicate that the tooltip has been removed.
 */
export function removeTooltip(
  container: Container,
  tooltip: Text | null,
): null {
  if (tooltip) {
    container.removeChild(tooltip);
    tooltip.destroy();
  }
  return null;
}
