import PlaySvg from "../assets/play-icon.svg";
import PauseSvg from "../assets/pause-icon.svg";
import { attachTooltip } from "../graphics/renderables/tooltip_manager";
import { GlobalContext } from "../context";
import { TOOLTIP_KEYS } from "../utils/constants/tooltips_constants";

export class PauseHandler {
  private ctx: GlobalContext;
  private pauseButton: HTMLButtonElement | null;
  private pauseIcon: HTMLImageElement;
  private isPaused: boolean;

  constructor(ctx: GlobalContext) {
    this.ctx = ctx;
    this.pauseButton = document.getElementById(
      "pause-button",
    ) as HTMLButtonElement;
    this.pauseIcon = document.createElement("img");
    this.isPaused = false;

    if (this.pauseButton) {
      this.setupButton();
    }
    this.setupShortcut();
  }

  private setupButton() {
    if (this.pauseButton) {
      this.pauseIcon.src = PauseSvg;
      this.pauseIcon.alt = "Pause Icon";
      this.pauseButton.appendChild(this.pauseIcon);
      this.pauseButton.onclick = () => this.togglePause();
      attachTooltip(this.pauseButton, TOOLTIP_KEYS.PAUSE_BUTTON);
    }
  }

  private setupShortcut() {
    document.addEventListener("keydown", (event) => {
      const activeElement = document.activeElement as HTMLElement;
      if (
        activeElement &&
        (activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement.isContentEditable)
      ) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        this.togglePause();
      }
    });
  }

  private togglePause() {
    this.isPaused = !this.isPaused;
    if (this.pauseButton) {
      this.pauseButton.title = this.isPaused ? "Resume" : "Pause";
      this.pauseButton.classList.toggle("paused", this.isPaused);
    }
    this.pauseIcon.src = this.isPaused ? PlaySvg : PauseSvg;

    // Handle animation pause/unpause
    if (this.isPaused) {
      this.ctx.pause();
    } else {
      this.ctx.unpause();
    }
  }
}
