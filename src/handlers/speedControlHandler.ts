import { GlobalContext } from "../context";
import { TOOLTIP_KEYS } from "../utils/constants/tooltips_constants";
import { Slider } from "../graphics/basic_components/slider";
import { CSS_CLASSES } from "../utils/constants/css_constants";

export class SpeedControlHandler {
  private ctx: GlobalContext;
  private slider: Slider;

  constructor(ctx: GlobalContext) {
    this.ctx = ctx;

    this.slider = new Slider({
      label: TOOLTIP_KEYS.SPEED_WHEEL,
      min: 0.5,
      max: 4,
      step: 0.1,
      initialValue: this.ctx.getCurrentSpeed(),
      onChange: (value) => this.handleSpeedChange(value),
    });

    const speedControlContainer = document.getElementById(
      CSS_CLASSES.SPEED_WHEEL_CONTAINER,
    );
    if (speedControlContainer) {
      speedControlContainer.appendChild(this.slider.toHTML());
    }
  }

  private handleSpeedChange(value: number) {
    this.ctx.changeSpeedMultiplier(value);
  }
}
