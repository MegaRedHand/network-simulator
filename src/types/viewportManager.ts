import { GlobalContext, Viewport } from "./../index";
import { DataGraph, GraphNode } from "./graphs/datagraph";
import { Device, Pc, Router, Server } from "./device";
import { ViewGraph } from "./graphs/viewgraph";

// Función para agregar un router en el centro del viewport
export function AddRouter(ctx: GlobalContext) {
  console.log("Entro a AddRouter");
  const viewgraph = ctx.getViewGraph();
  const datagraph = ctx.getDataGraph();
  const viewport = ctx.getViewport();

  // Obtener las coordenadas centrales del mundo después del zoom
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

  // Agregar el RouterNode al grafo
  viewgraph.addDevice(newRouter);

  console.log(
    `Router añadido con ID ${newRouter.id} en el centro de la pantalla.`,
  );
}

// Función para agregar un PC en el centro del viewport
export function AddPc(ctx: GlobalContext) {
  const viewgraph = ctx.getViewGraph();
  const datagraph = ctx.getDataGraph();
  const viewport = ctx.getViewport();

  // Obtener las coordenadas centrales del mundo después del zoom
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

  // Agregar el PCNode al grafo
  viewgraph.addDevice(newPC);

  console.log(`PC añadido con ID ${newPC.id} en el centro de la pantalla.`);
}

// Función para agregar un server en el centro del viewport (suponiendo que existe un tipo ServerNode)
export function AddServer(ctx: GlobalContext) {
  const viewgraph = ctx.getViewGraph();
  const datagraph = ctx.getDataGraph();
  const viewport = ctx.getViewport();

  // Obtener las coordenadas centrales del mundo después del zoom
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

  // Agregar el ServerNode al grafo
  viewgraph.addDevice(newServer);

  console.log(
    `Server añadido con ID ${newServer.id} en el centro de la pantalla.`,
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
  console.log(`setee Device ${nodeData.id}`);
}

function addDeviceToView(
  datagraph: DataGraph,
  viewgraph: ViewGraph,
  id: number,
) {
  const device = datagraph.getDevice(id);
  console.log(
    `El device que me da datagraph es: ${device.x}, ${device.y}, ${device.type}, [${[...device.connections].join(", ")}]`,
  );

  const position = { x: device.x, y: device.y }; // Establece la posición con las coordenadas de datagraph

  console.log(`position es ${position}`);
  switch (device.type) {
    case "Router":
      const router = new Router(id, viewgraph, position);
      viewgraph.addDevice(router);
      break;
    case "Server":
      const server = new Server(id, viewgraph, position);
      viewgraph.addDevice(server);
      break;
    case "Pc":
      const pc = new Pc(id, viewgraph, position);
      viewgraph.addDevice(pc);
      break;
  }
}

// Función para guardar el grafo actual en formato JSON
export function saveGraph(ctx: GlobalContext) {
  const datagraph: DataGraph = ctx.getDataGraph();

  const graphData: {
    id: number;
    x: number;
    y: number;
    type: string;
    connections: number[];
  }[] = [];

  // Serializar nodos
  datagraph.getDevices().forEach((deviceInfo) => {
    const id = deviceInfo[0];
    const info = deviceInfo[1];
    graphData.push({
      id: id,
      x: info.x,
      y: info.y,
      type: info.type, // Guardar el tipo de dispositivo (Router, Server, PC)
      connections: Array.from(info.connections.values()),
    });
  });

  // Convertir a JSON y descargar
  const jsonString = JSON.stringify(graphData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "networkGraph.json";
  link.click();
  URL.revokeObjectURL(url);

  console.log("Estado del grafo guardado.");
}

// Función para cargar un grafo desde un archivo JSON
export function loadGraph(jsonData: string, ctx: GlobalContext) {
  const graphData = JSON.parse(jsonData);
  const viewgraph = ctx.getViewGraph();
  const datagraph = ctx.getDataGraph();

  // Limpiar los nodos y las conexiones actuales
  viewgraph.clear();
  datagraph.clear();

  // Deserializar y recrear los nodos
  graphData.forEach(
    (nodeData: {
      id: number;
      x: number;
      y: number;
      type: string;
      connections: number[];
    }) => {
      // AGREGAR EL DATAGRAPH Y LAS ARISTAS
      console.log(nodeData);
      setDevice(datagraph, nodeData);
    },
  );
  datagraph.constructView(viewgraph);

  // // Paso 2: Establecer las conexiones una vez que todos los nodos están añadidos
  // graphData.forEach((nodeData: { id: number; connections: number[] }) => {
  //   for (const otherNodeId of nodeData.connections) {
  //     addConnectionToView(nodeData.id, otherNodeId, viewgraph);
  //   }
  // });

  // Establecer aristas

  console.log("Grafo cargado con éxito.");
}
function addConnectionToView(n1Id: number, n2Id: number, viewgraph: ViewGraph) {
  const device1 = viewgraph.getDevice(n1Id);
  const device2 = viewgraph.getDevice(n2Id);
  console.log(`posicion sprite 1: ${device1.x}, ${device1.y}`);
  console.log(`posicion sprite 2: ${device2.x}, ${device2.y}`);
  device1.connectTo(device2.id);
}
