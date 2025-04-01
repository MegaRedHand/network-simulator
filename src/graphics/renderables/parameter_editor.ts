import { TooltipManager } from "./tooltip_manager";

/**
 * Creates a parameter editor with a label and an input.
 * @param label - The text of the label.
 * @param initialValue - The initial value of the input.
 * @param onChange - Function that is executed when the value changes.
 * @returns An HTML element representing the parameter editor.
 */
export function createParameterEditor(
  label: string,
  initialValue: number | string,
  onChange: (newValue: number | string) => void,
): HTMLElement {
  // Create the editor container
  const container = document.createElement("div");
  container.className = "parameter-editor";

  // Create the label
  const labelElement = document.createElement("label");
  labelElement.textContent = label;
  labelElement.className = "parameter-editor-label";
  TooltipManager.getInstance().attachTooltip(labelElement, label);

  // Create the input
  const input = document.createElement("input");
  input.type = typeof initialValue === "number" ? "number" : "text";
  input.value = initialValue.toString();
  input.className = "parameter-editor-input";

  // Add the change event
  let previousValue = initialValue;

  input.addEventListener("change", () => {
    const newValue =
      input.type === "number"
        ? (parseFloat(input.value) as number)
        : (input.value as string);

    if (input.value === "") {
      input.value = previousValue.toString();
    } else {
      previousValue = newValue;
      onChange(newValue);
    }
  });

  // Add the label and input to the container
  container.appendChild(labelElement);
  container.appendChild(input);

  return container;
}

/**
 * Creates a parameter group with a toggle button.
 * @param groupName - The name of the group.
 * @param parameters - List of parameters with label, initial value, and onChange function.
 * @returns An HTML container that includes the toggle button and the parameters.
 */
export function createParameterGroup(
  groupName: string,
  parameters: {
    label: string;
    initialValue: number | string;
    onChange: (newValue: number | string) => void;
  }[],
): { toggleButton: HTMLElement; borderedContainer: HTMLElement } {
  // Create a bordered container for the parameter group
  const borderedContainer = document.createElement("div");
  borderedContainer.className = "parameter-group";

  // Create a container for the parameters
  const parametersContainer = document.createElement("div");
  parametersContainer.className = "parameter-group-parameters";

  // Add each parameter to the container
  parameters.forEach(({ label, initialValue, onChange }) => {
    const parameterEditor = createParameterEditor(
      label,
      initialValue,
      onChange,
    );
    parametersContainer.appendChild(parameterEditor);
  });

  // Create a toggle button
  const toggleButton = document.createElement("button");
  toggleButton.className = "right-bar-toggle-button";
  TooltipManager.getInstance().attachTooltip(toggleButton, groupName);
  toggleButton.textContent = groupName;
  toggleButton.addEventListener("click", () => {
    const isHidden = borderedContainer.style.display === "none";
    borderedContainer.style.display = isHidden ? "block" : "none";
  });

  // Hide the parameters by default
  borderedContainer.style.display = "none";

  // Add the parameter container to the bordered container
  borderedContainer.appendChild(parametersContainer);

  return { toggleButton, borderedContainer };
}
