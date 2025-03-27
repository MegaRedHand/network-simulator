import { GlobalContext } from "../context";
import { LeftBar } from "../graphics/left_bar";
import { layerToName } from "../types/devices/layer";
import { deselectElement, saveToLocalStorage } from "../types/viewportManager";
import { createLayerSelector } from "../graphics/canvas";

export class LayerHandler {
  private ctx: GlobalContext;
  private leftBar: LeftBar;
  private layerDropdown: {
    container: HTMLElement;
    getValue: () => string | null;
  } | null;

  constructor(ctx: GlobalContext, leftBar: LeftBar) {
    this.ctx = ctx;
    this.leftBar = leftBar;

    this.layerDropdown = createLayerSelector(
      this.getLayerOptions(),
      (value) => {
        this.selectNewLayer(value);
      },
    );

    const dropdownContainer = document.getElementById(
      "layer-dropdown-container",
    );
    if (dropdownContainer && this.layerDropdown) {
      dropdownContainer.appendChild(this.layerDropdown.container);
    }

    this.updateLayer();
  }

  private getLayerOptions() {
    return [
      { value: "app", text: "Application Layer" },
      { value: "transport", text: "Transport Layer" },
      { value: "network", text: "Network Layer" },
      { value: "link", text: "Link Layer" },
    ];
  }

  private selectNewLayer(selectedLayer: string | null) {
    if (!selectedLayer) return;

    console.log(`Layer selected: ${selectedLayer}`);
    this.ctx.changeViewGraph(selectedLayer);
    saveToLocalStorage(this.ctx);
    this.leftBar.setButtonsByLayer(selectedLayer);
    deselectElement();
  }

  private updateLayer() {
    const currLayer = layerToName(this.ctx.getCurrentLayer());
    if (this.layerDropdown) {
      const dropdownValue = this.layerDropdown.getValue();
      if (dropdownValue !== currLayer) {
        console.log(`Updating dropdown to current layer: ${currLayer}`);
      }
    }
    this.leftBar.setButtonsByLayer(currLayer);
  }
}
