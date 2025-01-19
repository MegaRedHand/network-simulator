import { Viewport } from "./graphics/viewport";
import { DataGraph } from "./types/graphs/datagraph";
import { ViewGraph } from "./types/graphs/viewgraph";
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  urManager,
} from "./types/viewportManager";
import { Layer } from "./types/devices/device";
import { IpAddress, IpAddressGenerator } from "./packets/ip";
import { layerFromName } from "./types/devices/layer";

export class GlobalContext {
  private viewport: Viewport = null;
  private datagraph: DataGraph;
  private viewgraph: ViewGraph;
  private saveIntervalId: NodeJS.Timeout | null = null;
  private ipGenerator: IpAddressGenerator;

  constructor(viewport: Viewport) {
    this.viewport = viewport;

    // Sets the initial datagraph and viewgraph
    loadFromLocalStorage(this);

    this.setIpGenerator();
  }

  getNextIp(): { ip: string; mask: string } {
    return this.ipGenerator.getNextIp();
  }

  private setNetwork(datagraph: DataGraph, layer: Layer) {
    this.datagraph = datagraph;
    this.viewport.clear();
    if (this.viewgraph) {
      this.viewgraph.destroy();
    }
    this.viewgraph = new ViewGraph(this.datagraph, this.viewport, layer);
    this.setIpGenerator();
  }

  load(datagraph: DataGraph, layer: Layer = Layer.Link) {
    this.setNetwork(datagraph, layer);
    this.setupAutoSave();
    saveToLocalStorage(this);
    urManager.reset();
  }

  getViewport() {
    return this.viewport;
  }

  getViewGraph() {
    return this.viewgraph;
  }

  getCurrentLayer() {
    return this.viewgraph.getLayer();
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

  private setIpGenerator() {
    let maxIp = IpAddress.parse("10.0.0.0");
    this.datagraph.getDevices().forEach((device) => {
      const ip = IpAddress.parse(device.ip);
      if (maxIp.octets < ip.octets) {
        maxIp = ip;
      }
    });
    // TODO: we should use IpAddress instead of string here and in Datagraph
    const baseIp = maxIp.toString();
    const mask = "255.255.255.255";
    this.ipGenerator = new IpAddressGenerator(baseIp, mask);
  }
}
