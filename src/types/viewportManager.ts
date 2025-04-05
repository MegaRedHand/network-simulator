import { GlobalContext } from "./../context";
import {
  DataGraph,
  GraphData,
  DataNode,
  getNumberOfInterfaces,
  NetworkInterfaceData,
} from "./graphs/datagraph";
import { ViewDevice } from "./view-devices/";
import { Edge } from "./edge";
import { RightBar } from "../graphics/right_bar";
import { Packet } from "./packet";
import { DeviceType } from "./view-devices/vDevice";
import { Layer } from "./layer";
import {
  UndoRedoManager,
  AddDeviceMove,
  RemoveDeviceMove,
  RemoveEdgeMove,
} from "./undo-redo";
import { SpeedMultiplier } from "./speedMultiplier";

type Selectable = ViewDevice | Edge | Packet;

let selectedElement: Selectable | null = null; // Global variable to store the selected element

export const urManager = new UndoRedoManager();

export function selectElement(element: Selectable) {
  deselectElement();

  if (element) {
    selectedElement = element;
    element.select();
  }
}

export function deselectElement() {
  if (selectedElement) {
    selectedElement.deselect();
    selectedElement = null;
    const rightBar = RightBar.getInstance();
    if (rightBar) {
      rightBar.clearContent();
    }
  }
}

export function refreshElement() {
  if (selectedElement) {
    // Deselect the current element and then reselect it to refresh
    selectedElement.deselect();
    selectedElement.select();
  }
}

export function isSelected(element: Selectable) {
  return element === selectedElement;
}

function isDevice(selectable: Selectable): selectable is ViewDevice {
  return selectable instanceof ViewDevice;
}

function isEdge(selectable: Selectable): selectable is Edge {
  return selectable instanceof Edge;
}

document.addEventListener("keydown", (event) => {
  // Check if the focus is on an input or textarea
  if (
    document.activeElement instanceof HTMLInputElement ||
    document.activeElement instanceof HTMLTextAreaElement
  ) {
    return; // Exit and do not execute shortcuts if the user is typing
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    if (selectedElement) {
      const viewgraph = !(selectedElement instanceof Packet)
        ? selectedElement.viewgraph
        : undefined;
      const currLayer = viewgraph?.getLayer();
      if (isDevice(selectedElement)) {
        const move = new RemoveDeviceMove(currLayer, selectedElement.id);
        urManager.push(viewgraph, move);
      } else if (isEdge(selectedElement)) {
        const ends = selectedElement.getDeviceIds();
        const connectedNodes = { n1: ends[0], n2: ends[1] };

        // Obtener las tablas de enrutamiento antes de eliminar la conexión
        const routingTable1 = viewgraph.getRoutingTable(connectedNodes.n1);
        const routingTable2 = viewgraph.getRoutingTable(connectedNodes.n2);

        // Crear movimiento con las tablas de enrutamiento
        const move = new RemoveEdgeMove(
          currLayer,
          connectedNodes,
          new Map([
            [connectedNodes.n1, routingTable1],
            [connectedNodes.n2, routingTable2],
          ]),
        );
        urManager.push(viewgraph, move);
      } else {
        // its a packet
        selectedElement.delete();
      }
    }
  } else if (event.key === "c" || event.key === "C") {
    if (selectedElement instanceof ViewDevice) {
      selectedElement.selectToConnect();
      const connectButton = document.querySelector(".right-bar-connect-button");

      if (connectButton) {
        connectButton.classList.toggle("selected-button");
      }
    }
  }
});

function setUpDeviceInfo(ctx: GlobalContext, type: DeviceType): DataNode {
  const viewport = ctx.getViewport();
  // Get the center coordinates of the world after zoom
  const { x, y } = viewport.toWorld(
    viewport.screenWidth / 2,
    viewport.screenHeight / 2,
  );
  const mac = ctx.getNextMac();

  const interfaces = [];
  const numberOfInterfaces = getNumberOfInterfaces(type);

  const isSwitch = type == DeviceType.Switch;

  for (let i = 0; i < numberOfInterfaces; i++) {
    const mac = ctx.getNextMac();
    const iface: NetworkInterfaceData = { name: `eth${i}`, mac };
    if (!isSwitch) {
      iface.ip = ctx.getNextIp().ip;
    }
    interfaces.push(iface);
  }
  if (isSwitch) {
    return { x, y, type, mac, interfaces };
  }
  const { ip, mask } = ctx.getNextIp();
  return { x, y, type, mac, ip, mask, interfaces };
}

// Function to add a device at the center of the viewport
export function addDevice(ctx: GlobalContext, type: DeviceType) {
  console.log(`Entered addDevice with ${type}`);
  const viewgraph = ctx.getViewGraph();

  const deviceInfo = setUpDeviceInfo(ctx, type);

  const move = new AddDeviceMove(viewgraph.getLayer(), deviceInfo);
  urManager.push(viewgraph, move);
}

// Function to save the current graph in JSON format
export function saveToFile(ctx: GlobalContext) {
  const graphData = ctx.getDataGraph().toData();

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

// Function to load a graph from a JSON file
export function loadFromFile(ctx: GlobalContext) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files[0];
    const reader = new FileReader();
    reader.readAsText(file);

    reader.onload = (readerEvent) => {
      const jsonData = readerEvent.target.result as string;
      const graphData: GraphData = JSON.parse(jsonData);
      ctx.load(DataGraph.fromData(graphData, ctx));

      console.log("Graph loaded successfully.");
    };
  };

  input.click();
}

const LOCAL_STORAGE_KEY = "graphData";

interface LocalStorageData {
  graph: string;
  layer: Layer;
  speedMultiplier: number;
}

export function saveToLocalStorage(ctx: GlobalContext) {
  const dataGraph = ctx.getDataGraph();
  const graphData = JSON.stringify(dataGraph.toData());
  const layer = ctx.getCurrentLayer();
  const speedMultiplier = ctx.getCurrentSpeed();
  const data: LocalStorageData = { graph: graphData, layer, speedMultiplier };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));

  console.log("Graph saved in local storage.");
}

export function loadFromLocalStorage(ctx: GlobalContext) {
  const jsonData = localStorage.getItem(LOCAL_STORAGE_KEY) || "{}";
  try {
    const data: LocalStorageData = JSON.parse(jsonData);
    console.debug("Data from local storage:", data);
    const graphData: GraphData = JSON.parse(data.graph);
    const speedMultiplier = new SpeedMultiplier(data.speedMultiplier || 1);
    console.log("Speed multiplier: ", speedMultiplier);
    console.debug("Graph data from local storage:", graphData);
    ctx.load(DataGraph.fromData(graphData, ctx), data.layer, speedMultiplier);
  } catch (error) {
    const extraData = { jsonData, error };
    console.error("Failed to load graph from local storage.", extraData);
    ctx.load(new DataGraph(ctx), Layer.App, new SpeedMultiplier(1));
    return;
  }
  console.log("Graph loaded from local storage.");
}
