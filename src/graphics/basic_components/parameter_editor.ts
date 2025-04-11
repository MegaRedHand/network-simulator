import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { ALERT_MESSAGES } from "../../utils/constants/alert_constants";
import { showError, showSuccess } from "../renderables/alert_manager";
import { attachTooltip } from "../renderables/tooltip_manager";

export interface EditableParameter {
  label: string;
  initialValue: number | string;
  onChange: (newValue: number | string) => void;
}

export class ParameterEditor {
  private ParametersContainer: HTMLElement;

  constructor(private parameters: EditableParameter[]) {
    // Create the main bordered container
    this.ParametersContainer = document.createElement("div");
    this.ParametersContainer.className = CSS_CLASSES.PARAMETER_GROUP;

    // Add each parameter editor directly to the Parameters container
    this.parameters.forEach((parameter) => {
      const parameterEditor = this.createParameterEditor(parameter);
      this.ParametersContainer.appendChild(parameterEditor);
    });
  }

  private createParameterEditor(parameter: EditableParameter): HTMLElement {
    const { label, initialValue, onChange } = parameter;

    // Create the editor container
    const container = document.createElement("div");
    container.className = CSS_CLASSES.PARAMETER_EDITOR;

    // Create the label
    const labelElement = document.createElement("label");
    labelElement.textContent = label;
    labelElement.className = CSS_CLASSES.PARAMETER_EDITOR_LABEL;
    attachTooltip(labelElement, label);

    // Create the input
    const input = document.createElement("input");
    input.type = typeof initialValue === "number" ? "number" : "text";
    input.value = initialValue.toString();
    input.className = CSS_CLASSES.PARAMETER_EDITOR_INPUT;

    // Add the change event
    let previousValue = initialValue;

    input.addEventListener("change", () => {
      const newValue =
        input.type === "number"
          ? (parseFloat(input.value) as number)
          : (input.value as string);

      if (input.value === "") {
        showError(ALERT_MESSAGES.EMPTY_INPUT);
        input.value = previousValue.toString();
      } else if (input.type === "number" && isNaN(newValue as number)) {
        input.value = previousValue.toString();
      } else {
        previousValue = newValue;
        onChange(newValue);
        showSuccess(ALERT_MESSAGES.PARAMETER_UPDATED);
      }
    });

    // Add the label and input to the container
    container.appendChild(labelElement);
    container.appendChild(input);

    return container;
  }

  toHTML(): HTMLElement {
    return this.ParametersContainer;
  }
}
