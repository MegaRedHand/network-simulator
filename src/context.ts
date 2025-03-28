import { Viewport } from "./graphics/viewport";
import { DataGraph } from "./types/graphs/datagraph";
import { ViewGraph } from "./types/graphs/viewgraph";
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  urManager,
} from "./types/viewportManager";
import { compareIps, IpAddress, IpAddressGenerator } from "./packets/ip";
import { layerFromName, Layer } from "./types/layer";
import { SpeedMultiplier } from "./types/speedMultiplier";
import {
  compareMacs,
  MacAddress,
  MacAddressGenerator,
} from "./packets/ethernet";
import { Colors } from "./utils";
import { DataNetworkDevice } from "./types/data-devices";

export class GlobalContext {
  private viewport: Viewport = null;
  private datagraph: DataGraph;
  private viewgraph: ViewGraph;
  private speedMultiplier: SpeedMultiplier;
  private saveIntervalId: NodeJS.Timeout | null = null;
  private ipGenerator: IpAddressGenerator;
  private macGenerator: MacAddressGenerator;
  private selectColor: number;

  constructor(viewport: Viewport) {
    this.selectColor = Colors.Violet;
    this.viewport = viewport;

    // Sets the initial datagraph and viewgraph
    loadFromLocalStorage(this);

    this.setIpGenerator();
    this.setMacGenerator();
  }

  getNextIp(): { ip: string; mask: string } {
    return this.ipGenerator.getNextIp();
  }

  getNextMac(): string {
    return this.macGenerator.getNextMac();
  }

  private setNetwork(datagraph: DataGraph, layer: Layer) {
    this.datagraph = datagraph;
    this.viewport.clear();
    if (this.viewgraph) {
      this.viewgraph.changeCurrLayer(layer);
    } else {
      this.viewgraph = new ViewGraph(datagraph, this, layer);
    }
    this.setIpGenerator();
    this.setMacGenerator();
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
    speedMultiplier: SpeedMultiplier = new SpeedMultiplier(1),
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
    return this.speedMultiplier;
  }

  getDataGraph() {
    return this.datagraph;
  }

  changeViewGraph(selectedLayer: string) {
    const layer = layerFromName(selectedLayer);
    this.setNetwork(this.datagraph, layer);
  }

  changeSpeedMultiplier(speedMultiplier: number) {
    if (this.viewgraph) {
      this.speedMultiplier = new SpeedMultiplier(speedMultiplier);
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

    for (const [, device] of this.datagraph.getDevices()) {
      if (device instanceof DataNetworkDevice) {
        if (compareIps(maxIp, device.ip) < 0) {
          maxIp = device.ip;
        }
      }
    }
    const baseIp = maxIp.toString();
    const mask = "255.255.255.255";
    this.ipGenerator = new IpAddressGenerator(baseIp, mask);
  }

  private setMacGenerator() {
    let maxMac = MacAddress.parse("00:00:10:00:00:00");
    for (const [, device] of this.datagraph.getDevices()) {
      if (compareMacs(maxMac, device.mac) < 0) {
        maxMac = device.mac;
      }
    }
    // TODO: we should use MacAddress instead of string here and in Datagraph
    const baseMac = maxMac.toString();
    this.macGenerator = new MacAddressGenerator(baseMac);
  }

  print() {
    console.log("VieGraph:");
    console.log(this.viewgraph);
    console.log("DataGraph");
    console.log(this.datagraph);
  }

  public change_select_color(color: number) {
    this.selectColor = color;
  }

  public get_select_color() {
    return this.selectColor;
  }
}
