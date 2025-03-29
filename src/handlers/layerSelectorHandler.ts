import { GlobalContext } from "../context";
import { LeftBar } from "../graphics/left_bar";
import { layerToName } from "../types/layer";
import { deselectElement, saveToLocalStorage } from "../types/viewportManager";

export class LayerHandler {
  private ctx: GlobalContext;
  private leftBar: LeftBar;
  private layerSelect: HTMLSelectElement | null;

  constructor(ctx: GlobalContext, leftBar: LeftBar) {
    this.ctx = ctx;
    this.leftBar = leftBar;
    this.layerSelect = document.getElementById(
      "layer-select",
    ) as HTMLSelectElement;

    if (this.layerSelect) {
      this.layerSelect.value = layerToName(this.ctx.getCurrentLayer());
      this.layerSelect.onchange = (event) => this.selectNewLayer(event);
      this.layerSelect.addEventListener("layerChanged", () =>
        this.updateLayer(),
      );
    }

    this.updateLayer();
  }

  private selectNewLayer(event: Event) {
    const selectedLayer = (event.target as HTMLSelectElement).value;
    console.debug(`Layer selected: ${selectedLayer}`);

    if (selectedLayer) {
      this.ctx.changeViewGraph(selectedLayer);
      saveToLocalStorage(this.ctx);
      this.leftBar.setButtonsByLayer(selectedLayer);
      deselectElement();
    }
  }

  private updateLayer() {
    const currLayer = layerToName(this.ctx.getCurrentLayer());
    if (this.layerSelect) {
      this.layerSelect.value = currLayer;
    }
    this.leftBar.setButtonsByLayer(currLayer);
  }
}
