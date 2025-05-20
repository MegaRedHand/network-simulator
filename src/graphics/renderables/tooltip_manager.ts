import { CONFIG_SWITCH_KEYS } from "../../config_menu/switches/switch_factory";
import { GlobalContext } from "../../context";
import { TOOLTIP_CONTENT } from "../../utils/constants/tooltips_constants";

let tooltipTimeout: NodeJS.Timeout | null = null;
let globalContext: GlobalContext | null = null;

/**
 * Sets the global context for tooltips.
 * @param context - The global context to use.
 */
export function TooltipManagersetGlobalContext(context: GlobalContext): void {
  globalContext = context;
}

/**
 * Attaches a tooltip to a given element.
 * @param element - The HTML element to attach the tooltip to.
 * @param key - The key for the tooltip content.
 * @param hideDelay - Whether to delay hiding the tooltip on mouse leave.
 */
export function attachTooltip(
  element: HTMLElement,
  key: string,
  hideDelay = false,
): void {
  const tooltipsEnabled =
    globalContext
      ?.getConfigMenu()
      .getConfigSwitchValue(CONFIG_SWITCH_KEYS.ENABLE_TOOLTIPS) ?? true;

  if (key in TOOLTIP_CONTENT) {
    if (tooltipsEnabled) {
      element.classList.add("has-tooltip");

      const showHandler = () => showTooltip(key);
      const hideHandler = () => {
        if (hideDelay) {
          startHideTooltipDelay();
        } else {
          hideTooltip();
        }
      };

      element.addEventListener("mouseenter", showHandler);
      element.addEventListener("mouseleave", hideHandler);

      // Add a mutation observer to detect when the element is removed
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "childList" &&
            !document.body.contains(element)
          ) {
            hideTooltip(); // Hide the tooltip if the element is removed
            observer.disconnect(); // Stop observing
          }
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      element.classList.remove("has-tooltip");
    }
  }
}

/**
 * Shows a tooltip with the specified key.
 * @param key - The key for the tooltip content.
 */
export function showTooltip(key: string): void {
  const tooltipsEnabled =
    globalContext
      ?.getConfigMenu()
      .getConfigSwitchValue(CONFIG_SWITCH_KEYS.ENABLE_TOOLTIPS) ?? true;
  if (!tooltipsEnabled) return;

  const text = TOOLTIP_CONTENT[key as keyof typeof TOOLTIP_CONTENT];
  const tooltip = document.getElementById("global-tooltip");
  if (tooltip) {
    tooltip.textContent = text;
    tooltip.style.display = "block";

    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
    }

    tooltip.addEventListener("mouseenter", () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
      }
    });

    tooltip.addEventListener("mouseleave", () => {
      startHideTooltipDelay();
    });
  }
}

/**
 * Hides the currently visible tooltip.
 */
export function hideTooltip(): void {
  const tooltip = document.getElementById("global-tooltip");
  if (tooltip) {
    tooltip.style.display = "none";
  }
}

/**
 * Updates the state of tooltips (enabled/disabled).
 */
export function updateTooltipsState(): void {
  const tooltipsEnabled =
    globalContext
      ?.getConfigMenu()
      .getConfigSwitchValue(CONFIG_SWITCH_KEYS.ENABLE_TOOLTIPS) ?? true;

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

/**
 * Starts a delay before hiding the tooltip.
 */
function startHideTooltipDelay(): void {
  tooltipTimeout = setTimeout(() => {
    hideTooltip();
  }, 300); // 300ms
}
