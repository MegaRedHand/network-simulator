import { TooltipManager } from "../renderables/tooltip_manager";

export interface ButtonProps {
  text: string; // Button text
  onClick: () => void; // Action on click
  classList?: string[]; // Optional list of CSS classes
  tooltip?: string; // Optional tooltip
}

export class Button {
  private button: HTMLButtonElement;

  constructor(private props: ButtonProps) {
    this.button = document.createElement("button");
    this.initializeButton();
  }

  private initializeButton(): void {
    const { text, onClick, classList, tooltip } = this.props;

    this.button.textContent = text;
    if (classList) {
      this.button.classList.add(...classList);
    }

    if (tooltip) {
      TooltipManager.getInstance().attachTooltip(this.button, tooltip);
    }

    this.button.onclick = onClick; // Assign the click handler
  }

  toHTML(): HTMLButtonElement {
    return this.button;
  }
}
