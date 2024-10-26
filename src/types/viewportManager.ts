import { GlobalContext } from "./../index";
import { Device, Pc, Router, Server } from "./device";
import { NetworkGraph } from "./networkgraph";

interface GraphNode {
  id: number;
  x: number;
  y: number;
  type: string;
}

interface GraphEdge {
  id: number;
  n1: number;
  n2: number;
}

// Función para agregar un router en el centro del viewport
export function AddRouter(ctx: GlobalContext) {
  console.log("Entro a AddRouter");
  const networkGraph = ctx.getNetwork();

  const newRouter: Device = new Router(networkGraph, ctx.getViewport());

  // Agregar el RouterNode al grafo
  networkGraph.addDevice(newRouter);

  console.log(
    `Router añadido con ID ${newRouter.id} en el centro de la pantalla.`
  );
}

// Función para agregar un PC en el centro del viewport
export function AddPc(ctx: GlobalContext) {
  const networkGraph = ctx.getNetwork();

  const newPC: Device = new Pc(networkGraph, ctx.getViewport());

  // Agregar el PCNode al grafo
  networkGraph.addDevice(newPC);

  console.log(`PC añadido con ID ${newPC.id} en el centro de la pantalla.`);
}

// Función para agregar un server en el centro del viewport (suponiendo que existe un tipo ServerNode)
export function AddServer(ctx: GlobalContext) {
  const networkGraph = ctx.getNetwork();

  const newServer: Device = new Server(networkGraph, ctx.getViewport());

  // Agregar el ServerNode al grafo
  networkGraph.addDevice(newServer);

  console.log(
    `Server añadido con ID ${newServer.id} en el centro de la pantalla.`
  );
}

// Función para guardar el grafo actual en formato JSON
export function saveGraph(ctx: GlobalContext) {
  const networkGraph: NetworkGraph = ctx.getNetwork();
  
  const graphData: { nodes: GraphNode[]; edges: GraphEdge[] }  = {
    nodes: [],
    edges: []
  };

  // Serializar nodos
  networkGraph.getDevices().forEach((device) => {
    graphData.nodes.push({
      id: device.id,
      x: device.sprite.x,
      y: device.sprite.y,
      type: device.constructor.name // Guardar el tipo de dispositivo (Router, Server, PC)
    });
  });

  // Usar un Set para rastrear las aristas ya agregadas y evitar duplicados
  const edgesAdded = new Set<number>();

  // Serializar conexiones
  networkGraph.getDevices().forEach((device) => {
    const connections = networkGraph.getConnections(device.id);
    connections.forEach((edge) => {
      // Comprobar si ya se ha añadido esta arista al JSON
      if (!edgesAdded.has(edge.id)) {
        graphData.edges.push({
          id: edge.id,
          n1: edge.connectedNodes.n1,
          n2: edge.connectedNodes.n2,
        });
        // Añadir el ID de la arista al Set para evitar duplicados
        edgesAdded.add(edge.id);
      }
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
  const networkGraph = ctx.getNetwork();
  const viewport = ctx.getViewport();

  // Limpiar los nodos y las conexiones actuales
  networkGraph.clear();

  // Deserializar y recrear los nodos
  graphData.nodes.forEach((nodeData: GraphNode) => {
    let newNode: Device;
    switch (nodeData.type) {
      case "Router":
        newNode = new Router(networkGraph, viewport);
        break;
      case "Server":
        newNode = new Server(networkGraph, viewport);
        break;
      case "Pc":
        newNode = new Pc(networkGraph, viewport);
        break;
      default:
        console.error("Tipo de nodo desconocido: " + nodeData.type);
        return;
    }

    // Configurar la posición del nodo
    newNode.sprite.x = nodeData.x;
    newNode.sprite.y = nodeData.y;

    // Agregar el nodo al grafo
    networkGraph.addDevice(newNode);
  });

  // Deserializar y recrear las conexiones (aristas)
  graphData.edges.forEach((edgeData: GraphEdge) => {
    const node1 = networkGraph.getDevice(edgeData.n1);
    const node2 = networkGraph.getDevice(edgeData.n2);

    if (node1 && node2) {
      node1.connectTo(node2, node1.sprite.x, node1.sprite.y, node2.sprite.x, node2.sprite.y);
    } else {
      console.error(`No se encontraron los nodos para la conexión: ${edgeData.id}`);
    }
  });

  console.log("Grafo cargado con éxito.");
}

