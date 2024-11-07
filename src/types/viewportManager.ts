import { GlobalContext } from "./../index";
import { DataGraph, GraphNode } from "./graphs/datagraph";
import { setCurrentLineStartId, Device, Pc, Router, Server } from "./device";
import { Edge } from "./edge";
import { Viewport } from "pixi-viewport";

let selectedElement: Device | Edge | null = null; // Variable global para almacenar el elemento seleccionado

// Función para manejar la selección
export function selectElement(element: Device | Edge | null) {


  console.log("selectedElement:", selectedElement);
  console.log("element:", element);


  if (selectedElement instanceof Device && !(element instanceof Device)) {
    setCurrentLineStartId(null); // Establece currentLineStartId en null
  }

  deselectElement();

  if (element) {
    selectedElement = element;
    element.select(); // select()
  }
}

// Función para deseleccionar
export function deselectElement() {
  if (selectedElement) {
    selectedElement.deselect();
    selectedElement = null;
  }
  const rightBar = document.getElementById("info-content");
  if (rightBar) {
    rightBar.innerHTML = ""; // Borra la información de la barra derecha
  }
}

// Function to add a router at the center of the viewport
export function AddRouter(ctx: GlobalContext) {
  console.log("Entered AddRouter");
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

  newRouter.eventMode = "static";
  newRouter.interactive = true;
  viewport.addChild(newRouter);

  console.log(
    `Router added with ID ${newRouter.id} at the center of the screen.`,
  );
}

// Function to add a PC at the center of the viewport
export function AddPc(ctx: GlobalContext) {
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

  newPC.eventMode = "static";
  newPC.interactive = true;
  viewport.addChild(newPC);

  console.log(`PC added with ID ${newPC.id} at the center of the screen.`);
}

// Function to add a server at the center of the viewport (assuming there is a ServerNode type)
export function AddServer(ctx: GlobalContext) {
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

  newServer.eventMode = "static";
  newServer.interactive = true;
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
