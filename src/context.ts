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
import { DataNetworkDevice } from "./types/data-devices";
import { Colors } from "./utils/utils";

export class GlobalContext {
  private viewport: Viewport = null;
  private datagraph: DataGraph;
  private viewgraph: ViewGraph;
  private speedMultiplier = new SpeedMultiplier(1);
  private saveIntervalId: NodeJS.Timeout | null = null;
  private ipGenerator: IpAddressGenerator;
  private macGenerator: MacAddressGenerator;

  // Settings
  private selectColor: number;
  private tooltipsEnabled: boolean;
  private useTcpReno: boolean;

  constructor(viewport: Viewport) {
    this.selectColor = Colors.Violet;
    this.tooltipsEnabled = true;
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
    if (this.viewgraph) {
      this.viewgraph.clearPacketsInTransit();
      this.viewgraph.clear();
    }
    this.viewgraph = new ViewGraph(datagraph, this, layer);
    this.setIpGenerator();
    this.setMacGenerator();
  }

  private setSpeedMultiplier(speedMultiplier: SpeedMultiplier) {
    this.speedMultiplier = speedMultiplier;
    // TODO: make this change go through SpeedControlHandler
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

  load(
    datagraph: DataGraph,
    layer: Layer = Layer.Link,
    speedMultiplier: SpeedMultiplier = new SpeedMultiplier(1),
  ) {
    this.setNetwork(datagraph, layer);
    this.viewport.restorePosition();
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
    return this.speedMultiplier.value;
  }

  getDataGraph() {
    return this.datagraph;
  }

  changeLayer(selectedLayer: string) {
    const layer = layerFromName(selectedLayer);
    this.viewgraph.changeCurrLayer(layer);
  }

  pause() {
    this.speedMultiplier.pause();
  }

  unpause() {
    this.speedMultiplier.unpause();
  }

  centerView() {
    const deviceCount = this.datagraph.getDeviceCount();

    if (deviceCount === 0) {
      this.viewport.setCenter();
      return;
    }

    const devices = this.datagraph.getDevices();
    let sumX = 0,
      sumY = 0;

    for (const [, device] of devices) {
      sumX += device.x;
      sumY += device.y;
    }

    const centerX = sumX / deviceCount;
    const centerY = sumY / deviceCount;

    this.viewport.setCenter(centerX, centerY);
  }

  changeSpeedMultiplier(speedMultiplier: number) {
    this.speedMultiplier.setSpeed(speedMultiplier);
    saveToLocalStorage(this);
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

  setSelectColor(color: number) {
    this.selectColor = color;
  }

  getSelectColor() {
    return this.selectColor;
  }

  setEnableTooltips(enabled: boolean) {
    this.tooltipsEnabled = enabled;
  }

  getEnableTooltips() {
    return this.tooltipsEnabled;
  }

  setUseTcpReno(enabled: boolean) {
    this.useTcpReno = enabled;
  }

  getUseTcpReno() {
    return this.useTcpReno;
  }
}
