import { attachTooltip } from "../renderables/tooltip_manager";

export interface ToggleButtonProps {
  text: string; // Default button text (used if textOn/textOff are not provided)
  textOn?: string; // Text to display when the button is toggled ON
  textOff?: string; // Text to display when the button is toggled OFF
  className?: string; // Optional CSS class
  tooltip?: string; // Optional tooltip
  onToggle?: (isToggled: boolean) => void; // Callback triggered when the toggle state changes
}

export class ToggleButton {
  private button: HTMLButtonElement;
  private isToggled = false; // Internal state for toggle buttons

  constructor(private props: ToggleButtonProps) {
    this.button = document.createElement("button");
    this.initializeButton();
  }

  private initializeButton(): void {
    const { text, textOff, className, tooltip, onToggle } = this.props;

    // Set the initial text (use textOff if provided, otherwise fallback to default text)
    this.button.textContent = textOff || text;

    if (className) {
      this.button.className = className;
    }

    if (tooltip) {
      attachTooltip(this.button, tooltip);
    }

    this.button.onclick = () => {
      this.isToggled = !this.isToggled; // Toggle the state
      this.button.classList.toggle("toggled", this.isToggled); // Add/remove "toggled" class

      // Update the button text based on the toggle state
      this.updateText();

      // Call the onToggle callback if provided
      if (onToggle) {
        onToggle(this.isToggled);
      }
    };
  }

  private updateText(): void {
    const { textOn, textOff, text } = this.props;

    // Update the button text based on the toggle state
    if (this.isToggled) {
      this.button.textContent = textOn || text; // Use textOn if provided, otherwise fallback to default text
    } else {
      this.button.textContent = textOff || text; // Use textOff if provided, otherwise fallback to default text
    }
  }

  toHTML(): HTMLButtonElement {
    return this.button;
  }

  // Method to programmatically toggle the button
  toggle(): void {
    this.isToggled = !this.isToggled;
    this.button.classList.toggle("toggled", this.isToggled);

    // Update the button text based on the toggle state
    this.updateText();

    // Call the onToggle callback if provided
    if (this.props.onToggle) {
      this.props.onToggle(this.isToggled);
    }
  }

  // Method to check if the button is currently toggled
  isCurrentlyToggled(): boolean {
    return this.isToggled;
  }
}
