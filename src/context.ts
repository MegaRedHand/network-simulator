import { Viewport } from "./graphics/viewport";
import { DataGraph } from "./types/graphs/datagraph";
import { ViewGraph } from "./types/graphs/viewgraph";
import {
  loadFromLocalStorage,
  saveToLocalStorage,
} from "./types/viewportManager";
import { Layer } from "./types/devices/device";

export class GlobalContext {
  private viewport: Viewport = null;
  private datagraph: DataGraph;
  private viewgraph: ViewGraph;
  private saveIntervalId: NodeJS.Timeout | null = null;

  initialize(viewport: Viewport) {
    this.viewport = viewport;
    loadFromLocalStorage(this);
  }

  private setNetWork(datagraph: DataGraph, layer: Layer) {
    this.datagraph = datagraph;
    this.viewport.clear();
    this.viewgraph = new ViewGraph(this.datagraph, this.viewport, layer);
  }

  load(datagraph: DataGraph, layer: Layer = Layer.Link) {
    this.setNetWork(datagraph, layer);
    this.setupAutoSave();
    saveToLocalStorage(this);
  }

  getViewport() {
    return this.viewport;
  }

  getViewGraph() {
    return this.viewgraph;
  }

  getDataGraph() {
    return this.datagraph;
  }

  private setupAutoSave() {
    this.clearAutoSave();

    this.datagraph.subscribeChanges(() => {
      if (this.saveIntervalId) {
        clearInterval(this.saveIntervalId);
      }
      this.saveIntervalId = setInterval(() => {
        saveToLocalStorage(this);
        clearInterval(this.saveIntervalId);
      }, 100);
    });
  }

  private clearAutoSave() {
    // Limpia el intervalo y evita duplicados
    if (this.saveIntervalId) {
      clearInterval(this.saveIntervalId);
      this.saveIntervalId = null;
    }
  }
}
