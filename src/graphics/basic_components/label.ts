import { attachTooltip } from "../renderables/tooltip_manager";

export class Label {
  private labelElement: HTMLLabelElement;

  constructor(label: string, tooltip?: string, className?: string) {
    this.labelElement = document.createElement("label");
    this.labelElement.innerHTML = `<strong>${label}</strong>`; // Use innerHTML for consistency
    this.labelElement.classList.add("label-dark");

    if (className) {
      this.labelElement.classList.add(className); // Add optional CSS class
    }

    if (tooltip) {
      attachTooltip(this.labelElement, tooltip); // Attach tooltip
    }
  }

  // Public method to render the label
  toHTML(): HTMLLabelElement {
    return this.labelElement;
  }
}
