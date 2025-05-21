import { Viewport } from "./graphics/viewport";
import { DataGraph, GraphData } from "./types/graphs/datagraph";
import { ViewGraph } from "./types/graphs/viewgraph";
import { urManager } from "./types/viewportManager";
import { compareIps, IpAddress, IpAddressGenerator } from "./packets/ip";
import { layerFromName, Layer } from "./types/layer";
import { SpeedMultiplier } from "./types/speedMultiplier";
import {
  compareMacs,
  MacAddress,
  MacAddressGenerator,
} from "./packets/ethernet";
import { DataNetworkDevice } from "./types/data-devices";
import { showError, showSuccess } from "./graphics/renderables/alert_manager";
import { ALERT_MESSAGES } from "./utils/constants/alert_constants";
import { ConfigMenu } from "./config_menu/config_menu";

export class GlobalContext {
  private viewport: Viewport = null;
  private datagraph: DataGraph;
  private viewgraph: ViewGraph;
  private speedMultiplier = new SpeedMultiplier(1);
  private saveIntervalId: NodeJS.Timeout | null = null;
  private ipGenerator: IpAddressGenerator;
  private macGenerator: MacAddressGenerator;
  private configMenu: ConfigMenu;

  constructor(viewport: Viewport) {
    this.viewport = viewport;

    this.setConfigMenu();

    // Sets the initial datagraph and viewgraph
    this.loadFromLocalStorage();

    this.setIpGenerator();
    this.setMacGenerator();
  }

  getNextIp(): { ip: string; mask: string } {
    return this.ipGenerator.getNextIp();
  }

  getMask(): string {
    return this.ipGenerator.getMask();
  }
  getNextMac(): string {
    return this.macGenerator.getNextMac();
  }

  private setConfigMenu() {
    this.configMenu = new ConfigMenu();
    this.configMenu.addListener(() => {
      this.saveToLocalStorage();
    });
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
    this.saveToLocalStorage();
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
    this.saveToLocalStorage();
  }

  private setupAutoSave() {
    this.clearAutoSave();

    this.datagraph.subscribeChanges(() => {
      if (this.saveIntervalId) {
        clearInterval(this.saveIntervalId);
      }
      this.saveIntervalId = setInterval(() => {
        this.saveToLocalStorage();
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
        device.interfaces.forEach((iface) => {
          if (iface.ip && compareIps(maxIp, iface.ip) < 0) {
            maxIp = iface.ip;
          }
        });
      }
    }
    const baseIp = maxIp.toString();
    const mask = "255.255.255.255";
    this.ipGenerator = new IpAddressGenerator(baseIp, mask);
  }

  private setMacGenerator() {
    let maxMac = MacAddress.parse("00:00:10:00:00:00");
    for (const [, device] of this.datagraph.getDevices()) {
      device.interfaces.forEach((iface) => {
        if (compareMacs(maxMac, iface.mac) < 0) {
          maxMac = iface.mac;
        }
      });
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

  public getConfigMenu(): ConfigMenu {
    return this.configMenu;
  }

  // save & load logic

  public saveToFile() {
    const graphData = this.getDataGraph().toData();

    // Convert to JSON and download
    const jsonString = JSON.stringify(graphData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "networkGraph.json";
    link.click();
    URL.revokeObjectURL(url);

    console.log("Graph state saved.");
  }

  public loadFromFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files[0];
      const reader = new FileReader();
      reader.readAsText(file);

      reader.onload = (readerEvent) => {
        const jsonData = readerEvent.target.result as string;
        let graphData: GraphData;
        let dataGraph: DataGraph;
        try {
          graphData = JSON.parse(jsonData);
          dataGraph = DataGraph.fromData(graphData, this);
        } catch (error) {
          console.error("Failed to load graph data:", error);
          showError(ALERT_MESSAGES.FAILED_TO_LOAD_GRAPH);
          return;
        }
        this.load(dataGraph, this.getCurrentLayer());
        this.centerView();

        showSuccess(ALERT_MESSAGES.GRAPH_LOADED_SUCCESSFULLY);
      };
    };

    input.click();
  }

  private static readonly LOCAL_STORAGE_KEY = "graphData";

  public saveToLocalStorage() {
    const dataGraph = this.getDataGraph();
    const graphData = JSON.stringify(dataGraph.toData());
    const layer = this.getCurrentLayer();
    const speedMultiplier = this.getCurrentSpeed();
    const switchesState = this.configMenu.getSwitchesPersistence();
    const data = { graph: graphData, layer, speedMultiplier, switchesState };
    localStorage.setItem(GlobalContext.LOCAL_STORAGE_KEY, JSON.stringify(data));
    console.log("Graph saved in local storage.");
  }

  private loadFromLocalStorage() {
    const jsonData =
      localStorage.getItem(GlobalContext.LOCAL_STORAGE_KEY) || "{}";
    try {
      const data = JSON.parse(jsonData);
      const graphData = JSON.parse(data.graph);
      const speedMultiplier = new SpeedMultiplier(data.speedMultiplier || 1);
      this.load(
        DataGraph.fromData(graphData, this),
        data.layer,
        speedMultiplier,
      );

      if (data.switchesState) {
        this.configMenu.applySwitchesPersistence(data.switchesState);
      }
    } catch (error) {
      this.load(new DataGraph(this), Layer.App, new SpeedMultiplier(1));
      console.log("Failed to load graph data from local storage:", error);
    }
  }
}
