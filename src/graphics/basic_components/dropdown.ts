import { TooltipManager } from "../renderables/tooltip_manager";

export interface DropdownOption {
  value: string; // Value associated with the option
  text: string; // Text to display for the option
}

export interface DropdownProps {
  tooltip?: string; // Tooltip for the dropdown
  options: DropdownOption[]; // Array of dropdown options
  onchange?: (value: string, event: Event) => void; // Callback triggered when an option is selected
}

export class Dropdown {
  private container: HTMLElement;
  private selected: HTMLElement;
  private optionsContainer: HTMLElement;
  private selectedValue: string | null = null;

  constructor(private props: DropdownProps) {
    this.container = document.createElement("div");
    this.container.classList.add("dropdown-container");

    this.selected = document.createElement("div");
    this.optionsContainer = document.createElement("div");

    this.initializeDropdown();
  }

  private initializeDropdown(): void {
    const { tooltip, options, onchange } = this.props;

    // Create the custom dropdown element
    const dropdown = document.createElement("div");
    dropdown.classList.add("custom-dropdown");

    // Create the element displaying the selected option
    this.selected.classList.add("selected-option");
    this.selected.textContent = "Select an option";
    if (tooltip) {
      TooltipManager.getInstance().attachTooltip(this.selected, tooltip);
    }
    dropdown.appendChild(this.selected);

    // Create the container for dropdown options
    this.optionsContainer.classList.add("options-container");

    // Populate the options
    options.forEach((optionData) => {
      this.addOption(optionData, onchange);
    });

    // Toggle the dropdown options visibility when clicking the selected option
    this.selected.onclick = () => {
      this.optionsContainer.classList.toggle("show");
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
    option.classList.add("dropdown-option");
    option.textContent = optionData.text;
    TooltipManager.getInstance().attachTooltip(option, optionData.text);

    // Set up click event for option selection
    option.onclick = (e) => {
      this.selected.textContent = optionData.text;
      this.selectedValue = optionData.value;
      this.optionsContainer.classList.remove("show"); // Close the options container
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

  // Public method to render the dropdown
  render(): HTMLElement {
    return this.container;
  }
}
