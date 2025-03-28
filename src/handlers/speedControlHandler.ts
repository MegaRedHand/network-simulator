import { GlobalContext } from "../context";
import { TooltipManager } from "../graphics/renderables/tooltip_manager";

export class SpeedControlHandler {
  private ctx: GlobalContext;
  private speedWheel: HTMLInputElement | null;
  private valueDisplay: HTMLElement | null;

  constructor(ctx: GlobalContext) {
    this.ctx = ctx;
    this.speedWheel = document.getElementById(
      "speed-wheel",
    ) as HTMLInputElement;
    TooltipManager.getInstance().attachTooltip(this.speedWheel, "speed-wheel");
    this.valueDisplay = document.querySelector(".value-display");

    if (this.speedWheel && this.valueDisplay) {
      this.updateSpeedWheel(this.ctx.getCurrentSpeed());
      this.speedWheel.addEventListener("input", (event) =>
        this.handleSpeedChange(event),
      );
    }
  }

  private updateSpeedWheel(value: number) {
    if (this.speedWheel && this.valueDisplay) {
      this.speedWheel.value = value.toString();
      this.valueDisplay.textContent = `${value}x`;
    }
  }

  private handleSpeedChange(event: Event) {
    const value = parseFloat((event.target as HTMLInputElement).value);
    if (this.valueDisplay) {
      this.valueDisplay.textContent = `${value}x`;
    }
    this.ctx.changeSpeedMultiplier(value);
  }
}
