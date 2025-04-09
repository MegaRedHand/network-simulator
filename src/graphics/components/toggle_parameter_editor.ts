import {
  ParameterEditor,
  EditableParameter,
} from "../basic_components/parameter_editor";
import { ToggleButton } from "../basic_components/toggle_button";
import { CSS_CLASSES } from "../../utils/constants/css_constants";

export class ToggleParameterEditor {
  private container: HTMLElement;
  private toggleButton: ToggleButton;
  private parameterEditor: ParameterEditor;

  constructor(
    groupName: string,
    tooltip: string,
    parameters: EditableParameter[],
  ) {
    // Create the main container
    this.container = document.createElement("div");

    // Create the parameter editor
    this.parameterEditor = new ParameterEditor(parameters);

    // Create the toggle button
    this.toggleButton = new ToggleButton({
      text: groupName,
      className: CSS_CLASSES.RIGHT_BAR_TOGGLE_BUTTON,
      tooltip: tooltip,
      onToggle: (isToggled) => {
        const parametersContainer = this.parameterEditor.toHTML();
        parametersContainer.style.display = isToggled ? "block" : "none";
      },
    });

    // Initially hide the parameters
    this.parameterEditor.toHTML().style.display = "none";

    // Append the toggle button and parameters to the container
    this.container.appendChild(this.toggleButton.toHTML());
    this.container.appendChild(this.parameterEditor.toHTML());
  }

  toHTML(): HTMLElement {
    return this.container;
  }
}
