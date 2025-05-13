import { GlobalContext } from "../context";
import { LeftBar } from "../graphics/left_bar";
import { layerToName } from "../types/layer";
import {
  deselectElement,
  isSelectedElementVisible,
  saveToLocalStorage,
} from "../types/viewportManager";
import {
  Dropdown,
  DropdownOption,
} from "../graphics/basic_components/dropdown";
import { TOOLTIP_KEYS } from "../utils/constants/tooltips_constants";
import { CSS_CLASSES } from "../utils/constants/css_constants";
import { showSuccess } from "../graphics/renderables/alert_manager";
import { ALERT_MESSAGES } from "../utils/constants/alert_constants";

export class LayerHandler {
  private ctx: GlobalContext;
  private leftBar: LeftBar;
  private layerDropdown: Dropdown;

  constructor(ctx: GlobalContext, leftBar: LeftBar) {
    this.ctx = ctx;
    this.leftBar = leftBar;

    // Create the dropdown for layer selection
    this.layerDropdown = new Dropdown(
      {
        default_text: "Layer",
        tooltip: TOOLTIP_KEYS.LAYER_SELECTOR,
        options: this.getLayerOptions(),
        onchange: (value) => {
          this.selectNewLayer(value);
        },
      },
      true,
    ); // Set not_push to true to avoid pushing the dropdown

    // Append the dropdown to the container
    const dropdownContainer = document.getElementById(
      CSS_CLASSES.LAYER_DROPDOWN_CONTAINER,
    );
    if (dropdownContainer) {
      dropdownContainer.appendChild(this.layerDropdown.toHTML());
    }

    // Listen for the "layerChanged" event and synchronize the dropdown state
    document.addEventListener("layerChanged", (event: CustomEvent) => {
      this.updateLayer(layerToName(event.detail.layer));
    });

    // Initialize the dropdown with the current layer
    const selectedLayer = layerToName(this.ctx.getCurrentLayer());
    this.applyLayerChange(selectedLayer, false); // No success message on initialization
    this.layerDropdown.setValue(selectedLayer);
  }

  private getLayerOptions(): DropdownOption[] {
    return [
      { value: "application", text: "App Layer" },
      { value: "transport", text: "Transport Layer" },
      { value: "network", text: "Network Layer" },
      { value: "link", text: "Link Layer" },
    ];
  }

  private updateLayer(currentLayer: string | null) {
    if (!currentLayer) return;

    this.layerDropdown.setValue(currentLayer);
  }

  private selectNewLayer(selectedLayer: string | null) {
    if (!selectedLayer) return;

    this.applyLayerChange(selectedLayer, true); // Show success message on layer change
  }

  /**
   * Applies the layer change logic.
   * @param selectedLayer - The layer to change to.
   * @param showAlert - Whether to show a success message.
   */
  private applyLayerChange(selectedLayer: string, showAlert: boolean) {
    this.ctx.changeLayer(selectedLayer);
    saveToLocalStorage(this.ctx);
    this.leftBar.setButtonsByLayer(selectedLayer);
    if (!isSelectedElementVisible()) {
      deselectElement();
    }

    if (showAlert) {
      showSuccess(ALERT_MESSAGES.LAYER_CHANGED, 5000);
    }
  }
}
