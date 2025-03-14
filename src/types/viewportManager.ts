import { GlobalContext } from "./../context";
import { DataGraph, GraphData } from "./graphs/datagraph";
import { Device } from "./devices/index";
import { Edge } from "./edge";
import { RightBar } from "../graphics/right_bar";
import { Packet } from "./packet";
import { DeviceType, Layer } from "./devices/device";
import { CreateDevice } from "./devices/utils";
import {
  UndoRedoManager,
  AddDeviceMove,
  RemoveDeviceMove,
  RemoveEdgeMove,
} from "./undo-redo";
import { SpeedMultiplier } from "./devices/speedMultiplier";

type Selectable = Device | Edge | Packet;

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

function isDevice(selectable: Selectable): selectable is Device {
  return selectable instanceof Device;
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
      let data;
      const currLayer = selectedElement.viewgraph.getLayer();
      if (isDevice(selectedElement)) {
        data = selectedElement.getCreateDevice();
        const move = new RemoveDeviceMove(currLayer, data);
        selectedElement.delete();
        urManager.push(move);
      } else if (isEdge(selectedElement)) {
        // Obtener las tablas de enrutamiento antes de eliminar la conexión
        const routingTable1 = selectedElement.viewgraph.getRoutingTable(
          selectedElement.connectedNodes.n1,
        );
        const routingTable2 = selectedElement.viewgraph.getRoutingTable(
          selectedElement.connectedNodes.n2,
        );

        // Crear movimiento con las tablas de enrutamiento
        const move = new RemoveEdgeMove(
          currLayer,
          selectedElement.connectedNodes,
          new Map([
            [selectedElement.connectedNodes.n1, routingTable1],
            [selectedElement.connectedNodes.n2, routingTable2],
          ]),
        );
        selectedElement.delete();
        urManager.push(move);
      } else {
        // it’s a packet
        selectedElement.delete();
      }
    }
  } else if (event.key === "c" || event.key === "C") {
    if (selectedElement instanceof Device) {
      selectedElement.selectToConnect();
      const connectButton = document.querySelector(".right-bar-connect-button");

      if (connectButton) {
        connectButton.classList.toggle("selected-button");
      }
    }
  }
});

function setUpDeviceInfo(ctx: GlobalContext, type: DeviceType) {
  const viewport = ctx.getViewport();
  // Get the center coordinates of the world after zoom
  const { x, y } = viewport.toWorld(
    viewport.screenWidth / 2,
    viewport.screenHeight / 2,
  );
  const mac = ctx.getNextMac();
  if (type == DeviceType.Switch) {
    return { x, y, type, mac };
  }
  const { ip, mask } = ctx.getNextIp();
  return { x, y, type, mac, ip, mask };
}

// Function to add a device at the center of the viewport
export function addDevice(ctx: GlobalContext, type: DeviceType) {
  console.log(`Entered addDevice with ${type}`);
  const viewgraph = ctx.getViewGraph();
  const datagraph = ctx.getDataGraph();

  const deviceInfo = setUpDeviceInfo(ctx, type);

  const id = datagraph.addNewDevice(deviceInfo);
  const node = datagraph.getDevice(id);
  const connections = datagraph.getConnections(id);

  const deviceData: CreateDevice = { id, node, connections };

  // Add the Device to the graph
  const newDevice = viewgraph.loadDevice(deviceData.id);

  const move = new AddDeviceMove(viewgraph.getLayer(), deviceData);
  urManager.push(move);

  console.log(
    `${DeviceType[newDevice.getType()]} added with ID ${newDevice.id} at the center of the screen.`,
  );

  // Select the new device
  selectElement(newDevice);
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
      ctx.load(DataGraph.fromData(graphData));

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
  const speedMultiplier = ctx.getCurrentSpeed().value;
  const data: LocalStorageData = { graph: graphData, layer, speedMultiplier };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));

  console.log("Graph saved in local storage.");
}

export function loadFromLocalStorage(ctx: GlobalContext) {
  const jsonData = localStorage.getItem(LOCAL_STORAGE_KEY) || "{}";
  try {
    const data: LocalStorageData = JSON.parse(jsonData);
    const graphData: GraphData = JSON.parse(data.graph);
    const speedMultiplier = new SpeedMultiplier(data.speedMultiplier || 1);
    console.log("Speed multiplier: ", speedMultiplier);
    ctx.load(DataGraph.fromData(graphData), data.layer, speedMultiplier);
  } catch (error) {
    const extraData = { jsonData, error };
    console.error("Failed to load graph from local storage.", extraData);
    ctx.load(new DataGraph(), Layer.App, new SpeedMultiplier(1));
    return;
  }
  console.log("Graph loaded from local storage.");
}
