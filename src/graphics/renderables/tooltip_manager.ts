import { GlobalContext } from "../../context";
import { TOOLTIP_CONTENT } from "../../utils/constants/tooltips_constants";

export class TooltipManager {
  private static instance: TooltipManager | null = null; // Singleton instance
  private tooltipsDictionary: Record<string, string> = TOOLTIP_CONTENT; // Dictionary for tooltips
  private globalContext: GlobalContext | null = null; // GlobalContext puede ser opcional
  private tooltipTimeout: NodeJS.Timeout | null = null;

  public static getInstance(): TooltipManager {
    if (!TooltipManager.instance) {
      TooltipManager.instance = new TooltipManager();
    }
    return TooltipManager.instance;
  }

  public setGlobalContext(globalContext: GlobalContext) {
    this.globalContext = globalContext;
  }

  public attachTooltip(element: HTMLElement, key: string, hideDelay = false) {
    const tooltipsEnabled = this.globalContext?.get_enable_tooltips() ?? true;

    if (key in this.tooltipsDictionary) {
      if (tooltipsEnabled) {
        element.classList.add("has-tooltip");
        element.addEventListener("mouseenter", () => this.showTooltip(key));
        element.addEventListener("mouseleave", () => {
          if (hideDelay) {
            this.startHideTooltipDelay();
          } else {
            this.hideTooltip();
          }
        });
      } else {
        element.classList.remove("has-tooltip");
      }
    }
  }

  private showTooltip(key: string) {
    const tooltipsEnabled = this.globalContext?.get_enable_tooltips() ?? true; // if no GlobalContext, assume tooltips are enabled
    if (!tooltipsEnabled) return;

    const text = this.tooltipsDictionary[key];
    const tooltip = document.getElementById("global-tooltip");
    if (tooltip) {
      tooltip.textContent = text;
      tooltip.style.display = "block";

      if (this.tooltipTimeout) {
        clearTimeout(this.tooltipTimeout);
        this.tooltipTimeout = null;
      }

      tooltip.addEventListener("mouseenter", () => {
        if (this.tooltipTimeout) {
          clearTimeout(this.tooltipTimeout);
          this.tooltipTimeout = null;
        }
      });

      tooltip.addEventListener("mouseleave", () => {
        this.startHideTooltipDelay();
      });
    }
  }

  private hideTooltip() {
    const tooltip = document.getElementById("global-tooltip");
    if (tooltip) {
      tooltip.style.display = "none";
    }
  }

  public updateTooltipsState() {
    const tooltipsEnabled = this.globalContext?.get_enable_tooltips() ?? true;

    // Select all elements with the "has-tooltip" class
    const tooltipElements = document.querySelectorAll(".has-tooltip");

    tooltipElements.forEach((element) => {
      const htmlElement = element as HTMLElement;

      if (tooltipsEnabled) {
        htmlElement.classList.add("has-tooltip");
      } else {
        htmlElement.classList.remove("has-tooltip");
      }
    });
  }

  private startHideTooltipDelay() {
    this.tooltipTimeout = setTimeout(() => {
      this.hideTooltip();
    }, 300); // 300ms
  }
}
