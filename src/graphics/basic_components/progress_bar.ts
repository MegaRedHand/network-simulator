import { CSS_CLASSES } from "../../utils/constants/css_constants";

export interface ProgressBarProps {
  current: number; // Current size of the queue
  max: number; // Maximum size of the queue
}

export class ProgressBar {
  private container: HTMLElement;
  private progress: HTMLElement;
  private text: HTMLElement;

  constructor(props: ProgressBarProps) {
    this.container = document.createElement("div");
    this.container.className = CSS_CLASSES.PROGRESS_BAR_CONTAINER;

    this.progress = document.createElement("div");
    this.progress.className = CSS_CLASSES.PROGRESS_BAR;

    this.text = document.createElement("div");
    this.text.className = CSS_CLASSES.PROGRESS_BAR_TEXT;

    this.container.appendChild(this.progress);
    this.container.appendChild(this.text);
    this.update(props.current, props.max);
  }

  // Updates the progress of the bar
  update(current: number, max: number): void {
    const fraction = `${current}/${max} bytes`; // Format as fraction
    const percentage = Math.min((current / max) * 100, 100); // Limit 100%
    this.progress.style.width = `${percentage}%`; // Updates the width of the green bar
    this.text.textContent = fraction; // Updates the text to show the fraction
  }

  // Returns the HTML container of the component
  render(): HTMLElement {
    return this.container;
  }
}
