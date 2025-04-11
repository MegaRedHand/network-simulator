import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { TooltipManager } from "../renderables/tooltip_manager";
import { Label } from "./label";

export interface DropdownOption {
  value: string; // Value associated with the option
  text: string; // Text to display for the option
  tooltip?: string; // Optional tooltip for the option
}

export interface DropdownProps {
  label?: string; // Optional label for the dropdown
  default_text?: string; // Default text to display when no option is selected
  tooltip?: string; // Tooltip for the dropdown
  options: DropdownOption[]; // Array of dropdown options
  onchange?: (value: string, event: Event) => void; // Callback triggered when an option is selected
}

export class Dropdown {
  private container: HTMLElement;
  private selected: HTMLElement;
  private optionsContainer: HTMLElement;
  private selectedValue: string | null = null;

  constructor(
    private props: DropdownProps,
    not_push = false,
  ) {
    this.container = document.createElement("div");

    this.selected = document.createElement("div");
    this.optionsContainer = document.createElement("div");
    if (not_push) {
      this.optionsContainer.classList.add(
        CSS_CLASSES.OPTIONS_CONTAINER_NOT_PUSH,
      );
    }
    this.initializeDropdown();
  }

  private initializeDropdown(): void {
    const { label, default_text, tooltip, options, onchange } = this.props;

    // Create the label if provided
    if (label) {
      const dropdown_label = new Label(label, tooltip).toHTML();
      this.container.appendChild(dropdown_label);
    }

    // Create the custom dropdown element
    const dropdown = document.createElement("div");
    dropdown.classList.add(CSS_CLASSES.CUSTOM_DROPDOWN);

    // Create the element displaying the selected option
    this.selected.classList.add(CSS_CLASSES.SELECTED_OPTION);
    this.selected.textContent = default_text
      ? `Select ${default_text}`
      : "Select option"; // Default text or fallback
    if (tooltip) {
      TooltipManager.getInstance().attachTooltip(this.selected, tooltip);
    }
    dropdown.appendChild(this.selected);

    // Create the container for dropdown options
    this.optionsContainer.classList.add(CSS_CLASSES.OPTIONS_CONTAINER);

    // Populate the options
    options.forEach((optionData) => {
      this.addOption(optionData, onchange);
    });

    // Toggle the dropdown options visibility when clicking the selected option
    this.selected.onclick = () => {
      this.optionsContainer.classList.toggle(CSS_CLASSES.SHOW);
    };

    dropdown.appendChild(this.optionsContainer);
    this.container.appendChild(dropdown);
  }

  private addOption(
    optionData: DropdownOption,
    onchange?: (value: string, event: Event) => void,
  ): void {
    // Validate the option object
    if (
      !optionData ||
      typeof optionData.value !== "string" ||
      typeof optionData.text !== "string"
    ) {
      console.warn("Invalid option data:", optionData);
      return;
    }

    // Create an element for the option
    const option = document.createElement("div");
    option.classList.add(CSS_CLASSES.DROPDOWN_OPTION);
    option.textContent = optionData.text;
    TooltipManager.getInstance().attachTooltip(option, optionData.text, true);

    // Set up click event for option selection
    option.onclick = (e) => {
      this.selected.textContent = optionData.text;
      this.selectedValue = optionData.value;
      this.optionsContainer.classList.remove(CSS_CLASSES.SHOW); // Close the options container
      if (onchange) {
        onchange(optionData.value, e); // Trigger the onchange callback
      }
    };

    this.optionsContainer.appendChild(option);
  }

  // Public method to get the currently selected value
  getValue(): string | null {
    return this.selectedValue;
  }

  // Public method to update the dropdown options
  setOptions(newOptions: DropdownOption[]): void {
    this.optionsContainer.innerHTML = ""; // Clear existing options
    newOptions.forEach((option) => {
      this.addOption(option, this.props.onchange);
    });
  }

  setValue(value: string): void {
    const option = this.props.options.find((opt) => opt.value === value);
    if (!option) {
      console.warn(`Option with value "${value}" not found.`);
      return;
    }

    this.selected.textContent = option.text;
    this.selectedValue = option.value;
    this.optionsContainer.classList.remove(CSS_CLASSES.SHOW); // Ensure the dropdown is closed
  }

  // Public method to render the dropdown
  toHTML(): HTMLElement {
    return this.container;
  }
}
