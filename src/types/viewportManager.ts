import { GlobalContext } from "./../index";
import { DataGraph, GraphNode } from "./graphs/datagraph";
import { Device, Pc, Router, Server } from "./devices/index";
import { Edge } from "./edge";
import { RightBar } from "../index"; // Ensure the path is correct
import { Packet } from "./packet";

let selectedElement: Device | Edge | Packet | null = null; // Global variable to store the selected element

export function selectElement(element: Device | Edge | Packet | null) {
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Delete" || event.key === "Backspace") {
    if (selectedElement) {
      selectedElement.delete();
    }
  }

  if (event.key === "c" || event.key === "C") {
    if (selectedElement instanceof Device) {
      selectedElement.selectToConnect(selectedElement.id);
      const connectButton = document.querySelector(".right-bar-button");

      if (connectButton) {
        connectButton.classList.toggle("selected-button");
      }
    }
  }
});

// Function to add a router at the center of the viewport
export function AddRouter(ctx: GlobalContext) {
  console.log("Entered AddRouter");
  deselectElement();
  const viewgraph = ctx.getViewGraph();
  const datagraph = ctx.getDataGraph();
  const viewport = ctx.getViewport();

  // Get the center coordinates of the world after zoom
  const worldCenter = viewport.toWorld(
    viewport.screenWidth / 2,
    viewport.screenHeight / 2,
  );

  const idDevice = datagraph.addNewDevice({
    x: worldCenter.x,
    y: worldCenter.y,
    type: "Router",
  });
  const device = datagraph.getDevice(idDevice);

  const newRouter: Device = new Router(idDevice, viewgraph, {
    x: device.x,
    y: device.y,
  });

  // Add the RouterNode to the graph
  viewgraph.addDevice(newRouter);
  viewport.addChild(newRouter);

  console.log(
    `Router added with ID ${newRouter.id} at the center of the screen.`,
  );
}

// Function to add a PC at the center of the viewport
export function AddPc(ctx: GlobalContext) {
  deselectElement();
  const viewgraph = ctx.getViewGraph();
  const datagraph = ctx.getDataGraph();
  const viewport = ctx.getViewport();

  // Get the center coordinates of the world after zoom
  const worldCenter = viewport.toWorld(
    viewport.screenWidth / 2,
    viewport.screenHeight / 2,
  );

  const idDevice = datagraph.addNewDevice({
    x: worldCenter.x,
    y: worldCenter.y,
    type: "Pc",
  });
  const device = datagraph.getDevice(idDevice);

  const newPC: Device = new Pc(idDevice, viewgraph, {
    x: device.x,
    y: device.y,
  });

  // Add the PCNode to the graph
  viewgraph.addDevice(newPC);
  viewport.addChild(newPC);

  console.log(`PC added with ID ${newPC.id} at the center of the screen.`);
}

// Function to add a server at the center of the viewport (assuming there is a ServerNode type)
export function AddServer(ctx: GlobalContext) {
  deselectElement();
  const viewgraph = ctx.getViewGraph();
  const datagraph = ctx.getDataGraph();
  const viewport = ctx.getViewport();

  // Get the center coordinates of the world after zoom
  const worldCenter = viewport.toWorld(
    viewport.screenWidth / 2,
    viewport.screenHeight / 2,
  );

  const idDevice = datagraph.addNewDevice({
    x: worldCenter.x,
    y: worldCenter.y,
    type: "Server",
  });
  const device = datagraph.getDevice(idDevice);

  const newServer: Device = new Server(idDevice, viewgraph, {
    x: device.x,
    y: device.y,
  });

  // Add the ServerNode to the graph
  viewgraph.addDevice(newServer);
  viewport.addChild(newServer);

  console.log(
    `Server added with ID ${newServer.id} at the center of the screen.`,
  );
}

function setDevice(
  datagraph: DataGraph,
  nodeData: {
    id: number;
    x: number;
    y: number;
    type: string;
    connections: number[];
  },
) {
  const connections = new Set(nodeData.connections);
  const graphNode: GraphNode = {
    x: nodeData.x,
    y: nodeData.y,
    type: nodeData.type,
    connections: connections,
  };
  datagraph.addDevice(nodeData.id, graphNode);
  console.log(`Device set with ID ${nodeData.id}`);
}

// Function to save the current graph in JSON format
export function saveGraph(ctx: GlobalContext) {
  const datagraph: DataGraph = ctx.getDataGraph();

  const graphData: {
    id: number;
    x: number;
    y: number;
    type: string;
    connections: number[];
  }[] = [];

  // Serialize nodes
  datagraph.getDevices().forEach((deviceInfo) => {
    const id = deviceInfo[0];
    const info = deviceInfo[1];
    graphData.push({
      id: id,
      x: info.x,
      y: info.y,
      type: info.type, // Save the device type (Router, Server, PC)
      connections: Array.from(info.connections.values()),
    });
  });

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
export function loadGraph(jsonData: string, ctx: GlobalContext) {
  const graphData = JSON.parse(jsonData);
  const viewgraph = ctx.getViewGraph();
  const datagraph = ctx.getDataGraph();

  // Clear current nodes and connections
  viewgraph.clear();
  datagraph.clear();

  // Deserialize and recreate nodes
  graphData.forEach(
    (nodeData: {
      id: number;
      x: number;
      y: number;
      type: string;
      connections: number[];
    }) => {
      // ADD DATAGRAPH AND EDGES
      console.log(nodeData);
      setDevice(datagraph, nodeData);
    },
  );

  viewgraph.constructView();

  console.log("Graph loaded successfully.");
}
