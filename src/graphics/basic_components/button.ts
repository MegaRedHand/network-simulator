import { TooltipManager } from "../renderables/tooltip_manager";

export interface ButtonProps {
  text: string; // Button text
  onClick: () => void; // Action on click
  className?: string; // Optional CSS class
  tooltip?: string; // Optional tooltip
  isToggle?: boolean; // Whether the button should act as a toggle
  onToggle?: (isToggled: boolean) => void; // Callback triggered when the toggle state changes
}

export class Button {
  private button: HTMLButtonElement;
  private isToggled = false; // Internal state for toggle buttons

  constructor(private props: ButtonProps) {
    this.button = document.createElement("button");
    this.initializeButton();
  }

  private initializeButton(): void {
    const { text, onClick, className, tooltip, isToggle, onToggle } =
      this.props;

    this.button.textContent = text;
    if (className) {
      this.button.className = className;
    }

    if (tooltip) {
      TooltipManager.getInstance().attachTooltip(this.button, tooltip);
    }

    this.button.onclick = () => {
      if (isToggle) {
        this.isToggled = !this.isToggled; // Toggle the state
        this.button.classList.toggle("toggled", this.isToggled); // Add/remove "toggled" class

        // Call the onToggle callback if provided
        if (onToggle) {
          onToggle(this.isToggled);
        }
      }
      onClick(); // Call the provided onClick handler
    };
  }

  render(): HTMLButtonElement {
    return this.button;
  }

  // Method to programmatically toggle the button
  toggle(): void {
    if (this.props.isToggle) {
      this.isToggled = !this.isToggled;
      this.button.classList.toggle("toggled", this.isToggled);

      // Call the onToggle callback if provided
      if (this.props.onToggle) {
        this.props.onToggle(this.isToggled);
      }
    }
  }

  // Method to check if the button is currently toggled
  isCurrentlyToggled(): boolean {
    return this.isToggled;
  }
}
