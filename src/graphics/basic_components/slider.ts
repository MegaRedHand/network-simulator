import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { attachTooltip } from "../renderables/tooltip_manager";

export interface SliderProps {
  label: string; // Label displayed above the slider
  min: number; // Minimum value of the slider
  max: number; // Maximum value of the slider
  step: number; // Slider increment
  initialValue: number; // Initial value of the slider
  onChange?: (value: number) => void; // Callback executed when the value changes
}

export class Slider {
  private container: HTMLElement;
  private valueDisplay: HTMLElement;
  private sliderInput: HTMLInputElement;

  constructor(props: SliderProps) {
    this.container = document.createElement("div");
    this.container.classList.add(CSS_CLASSES.SLIDER_CONTAINER);

    const label = document.createElement("div");
    label.textContent = props.label;
    label.classList.add(CSS_CLASSES.SLIDER_LABEL);
    attachTooltip(label, props.label);

    this.valueDisplay = document.createElement("div");
    this.valueDisplay.textContent = `${props.initialValue}x`;
    this.valueDisplay.classList.add(CSS_CLASSES.SLIDER_VALUE);

    this.sliderInput = document.createElement("input");
    this.sliderInput.type = "range";
    this.sliderInput.min = props.min.toString();
    this.sliderInput.max = props.max.toString();
    this.sliderInput.step = props.step.toString();
    this.sliderInput.value = props.initialValue.toString();
    this.sliderInput.classList.add(CSS_CLASSES.SLIDER_INPUT);

    this.sliderInput.addEventListener("input", () => {
      const value = parseFloat(this.sliderInput.value);
      this.valueDisplay.textContent = `${value}x`;
      if (props.onChange) {
        props.onChange(value);
      }
    });

    this.sliderInput.addEventListener("change", () => {
      this.sliderInput.blur();
    });
    this.sliderInput.addEventListener("mouseup", () => {
      this.sliderInput.blur();
    });
    this.sliderInput.addEventListener("touchend", () => {
      this.sliderInput.blur();
    });

    this.container.appendChild(label);
    this.container.appendChild(this.sliderInput);
    this.container.appendChild(this.valueDisplay);
  }

  toHTML(): HTMLElement {
    return this.container;
  }
}
