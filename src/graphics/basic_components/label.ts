import { TooltipManager } from "../renderables/tooltip_manager";

export class Label {
  private labelElement: HTMLLabelElement;

  constructor(label: string, tooltip?: string, className?: string) {
    this.labelElement = document.createElement("label");
    this.labelElement.innerHTML = `<strong>${label}</strong>`; // Use innerHTML for consistency

    if (className) {
      this.labelElement.classList.add(className); // Add optional CSS class
    }

    if (tooltip) {
      TooltipManager.getInstance().attachTooltip(this.labelElement, tooltip); // Attach tooltip
    }
  }

  // Public method to render the label
  render(): HTMLLabelElement {
    return this.labelElement;
  }
}
