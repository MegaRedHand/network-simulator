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
import { SpeedMultiplier } from "./types/devices/speedMultiplier";

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

  private setNetwork(
    datagraph: DataGraph,
    layer: Layer,
    speedMultiplier?: SpeedMultiplier,
  ) {
    this.datagraph = datagraph;
    this.viewport.clear();
    this.viewgraph = new ViewGraph(this.datagraph, this.viewport, layer);
    this.viewgraph.setSpeed(speedMultiplier?.value || 1);
    this.setIpGenerator();
  }

  private setSpeedMultiplier(speedMultiplier: SpeedMultiplier) {
    if (speedMultiplier && speedMultiplier.value > 0) {
      this.changeSpeedMultiplier(speedMultiplier.value);
      // Update the wheel display after setting the speed
      const speedWheel = document.getElementById(
        "speed-wheel",
      ) as HTMLInputElement;
      const valueDisplay = document.querySelector(".value-display");
      if (speedWheel && valueDisplay) {
        speedWheel.value = speedMultiplier.value.toString();
        valueDisplay.textContent = `${speedMultiplier.value}x`;
      }
    }
  }

  load(
    datagraph: DataGraph,
    layer: Layer = Layer.Link,
    speedMultiplier: SpeedMultiplier = SpeedMultiplier.parse(1),
  ) {
    this.setNetwork(datagraph, layer);
    this.setSpeedMultiplier(speedMultiplier);
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

  getCurrentSpeed() {
    return this.viewgraph.getSpeed();
  }

  getDataGraph() {
    return this.datagraph;
  }

  changeViewGraph(selectedLayer: string) {
    const layer = layerFromName(selectedLayer);
    const speedMultiplier = this.getCurrentSpeed();
    this.setNetwork(this.datagraph, layer, speedMultiplier);
  }

  changeSpeedMultiplier(speedMultiplier: number) {
    if (this.viewgraph) {
      this.viewgraph.setSpeed(speedMultiplier);
      saveToLocalStorage(this);
    }
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
