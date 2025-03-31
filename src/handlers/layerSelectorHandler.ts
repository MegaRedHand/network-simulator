import { GlobalContext } from "../context";
import { LeftBar } from "../graphics/left_bar";
import { layerToName } from "../types/layer";
import { deselectElement, saveToLocalStorage } from "../types/viewportManager";
import { createLayerSelector } from "../graphics/canvas";

export class LayerHandler {
  private ctx: GlobalContext;
  private leftBar: LeftBar;
  private layerDropdown: {
    container: HTMLElement;
    getValue: () => string | null;
    setValue: (value: string) => void;
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

    // Escucha el evento layerChanged y sincroniza el estado del dropdown
    document.addEventListener("layerChanged", (event: CustomEvent) => {
      this.updateLayer(layerToName(event.detail.layer));
    });

    // Inicializa el estado del dropdown con la capa actual
    this.selectNewLayer(layerToName(this.ctx.getCurrentLayer()));
  }

  private getLayerOptions() {
    return [
      { value: "application", text: "App Layer" },
      { value: "transport", text: "Transport Layer" },
      { value: "network", text: "Network Layer" },
      { value: "link", text: "Link Layer" },
    ];
  }

  private updateLayer(currentLayer: string | null) {
    if (!currentLayer || !this.layerDropdown) return;

    this.layerDropdown.setValue(currentLayer); // update dropdown
    console.debug(`Dropdown updated to layer: ${currentLayer}`);
  }

  private selectNewLayer(selectedLayer: string | null) {
    if (!selectedLayer) return;

    if (this.layerDropdown) {
      this.layerDropdown.setValue(selectedLayer);
    }

    console.debug(`Layer selected: ${selectedLayer}`);
    this.ctx.changeViewGraph(selectedLayer);
    saveToLocalStorage(this.ctx);
    this.leftBar.setButtonsByLayer(selectedLayer);
    deselectElement();
  }
}
