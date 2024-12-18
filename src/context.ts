import { Viewport } from "./graphics/viewport";
import { DataGraph } from "./types/graphs/datagraph";
import { ViewGraph } from "./types/graphs/viewgraph";
import {
  loadFromLocalStorage,
  saveToLocalStorage,
} from "./types/viewportManager";
import { Layer } from "./types/devices/device";
import { IpAddressGenerator } from "./packets/ip";
import { layerFromName } from "./types/devices/utils";

export class GlobalContext {
  private viewport: Viewport = null;
  private datagraph: DataGraph;
  private viewgraph: ViewGraph;
  private saveIntervalId: NodeJS.Timeout | null = null;
  private ipGenerator: IpAddressGenerator;

  initialize(viewport: Viewport) {
    this.viewport = viewport;

    const baseIp = "192.168.1.0";
    const mask = "255.255.255.0";
    this.ipGenerator = new IpAddressGenerator(baseIp, mask);
    loadFromLocalStorage(this);
  }

  getNextIp(): { ip: string; mask: string } {
    return this.ipGenerator.getNextIp();
  }

  private setNetwork(datagraph: DataGraph, layer: Layer) {
    this.datagraph = datagraph;
    this.viewport.clear();
    this.viewgraph = new ViewGraph(this.datagraph, this.viewport, layer);
  }

  load(datagraph: DataGraph, layer: Layer = Layer.Link) {
    this.setNetwork(datagraph, layer);
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

  changeViewGraph(selectedLayer: string) {
    const layer = layerFromName(selectedLayer);
    this.setNetwork(this.datagraph, layer);
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
