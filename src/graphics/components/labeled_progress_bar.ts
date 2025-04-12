import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { ProgressBar } from "../basic_components/progress_bar";
import { attachTooltip } from "../renderables/tooltip_manager";

export class LabeledProgressBar {
  private container: HTMLElement;
  private labelElement: HTMLElement;
  private progressBar: ProgressBar;

  constructor(
    label: string,
    current: number,
    max: number,
    subscribe: (progressBar: ProgressBar) => void,
  ) {
    // Create the container for the label and the progress bar
    this.container = document.createElement("div");
    this.container.className = CSS_CLASSES.PROGRESS_BAR_WRAPPER;

    // Create the label
    this.labelElement = document.createElement("div");
    this.labelElement.className = CSS_CLASSES.CENTRAL_LABEL;
    this.labelElement.textContent = label;
    attachTooltip(this.labelElement, label);

    // Create the progress bar
    this.progressBar = new ProgressBar({ current, max });

    // Add the label and progress bar to the container
    this.container.appendChild(this.labelElement);
    this.container.appendChild(this.progressBar.toHTML());

    // Subscribe to changes in the progress bar
    subscribe(this.progressBar);
  }

  toHTML(): HTMLElement {
    return this.container;
  }
}
