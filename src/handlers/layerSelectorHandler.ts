import { GlobalContext } from "../context";
import { LeftBar } from "../graphics/left_bar";
import { layerToName } from "../types/layer";
import { deselectElement, saveToLocalStorage } from "../types/viewportManager";
import {
  Dropdown,
  DropdownOption,
} from "../graphics/basic_components/dropdown";
import { TOOLTIP_KEYS } from "../utils/constants/tooltips_constants";

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
      "layer-dropdown-container",
    );
    if (dropdownContainer) {
      dropdownContainer.appendChild(this.layerDropdown.render());
    }

    // Listen for the "layerChanged" event and synchronize the dropdown state
    document.addEventListener("layerChanged", (event: CustomEvent) => {
      this.updateLayer(layerToName(event.detail.layer));
    });

    // Initialize the dropdown with the current layer
    this.selectNewLayer(layerToName(this.ctx.getCurrentLayer()));
    this.layerDropdown.setValue(layerToName(this.ctx.getCurrentLayer()));
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

    console.debug(`Layer selected: ${selectedLayer}`);
    this.ctx.changeViewGraph(selectedLayer);
    saveToLocalStorage(this.ctx);
    this.leftBar.setButtonsByLayer(selectedLayer);
    deselectElement();
  }
}
