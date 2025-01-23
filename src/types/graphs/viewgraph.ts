import { Device } from "./../devices/index"; // Import the Device class
import { Edge } from "./../edge";
import { DataGraph, DeviceId, GraphNode, isRouter } from "./datagraph";
import { Viewport } from "../../graphics/viewport";
import { Layer, layerIncluded } from "../devices/layer";
import { SpeedMultiplier } from "../devices/speedMultiplier";
import { CreateDevice, createDevice } from "../devices/utils";
import { layerFromType } from "../devices/device";

export type EdgeId = number;

function generateConnectionKey(id1: number, id2: number): string {
  return [id1, id2].sort().join(",");
}

function parseConnectionKey(key: string): { id1: number; id2: number } {
  const connection: number[] = key
    .split(",")
    .map((value) => parseInt(value.trim()));
  return { id1: connection[0], id2: connection[1] };
}

export class ViewGraph {
  private devices: Map<DeviceId, Device> = new Map<DeviceId, Device>();
  private edges: Map<EdgeId, Edge> = new Map<EdgeId, Edge>();
  private idCounter: EdgeId = 1;
  datagraph: DataGraph;
  private layer: Layer;
  private speedMultiplier: SpeedMultiplier;
  viewport: Viewport;

  constructor(datagraph: DataGraph, viewport: Viewport, layer: Layer) {
    this.datagraph = datagraph;
    this.viewport = viewport;
    this.layer = layer;
    this.speedMultiplier = new SpeedMultiplier(1);
    this.constructView();
  }

  private constructView() {
    // TODO: Adjust construction based on the selected layer in the future
    console.log("Constructing ViewGraph from DataGraph");
    const connections = new Set<string>();

    this.datagraph.getDevices().forEach((graphNode, deviceId) => {
      if (layerIncluded(layerFromType(graphNode.type), this.layer)) {
        const deviceInfo = { ...graphNode, id: deviceId };
        this.addDevice(deviceInfo);

        this.layer_dfs(
          this.datagraph.getDevices(),
          deviceId,
          deviceId,
          new Set([deviceId]),
          connections,
        );
      }
    });

    connections.forEach((key) => {
      const connection = parseConnectionKey(key);
      const device1 = this.getDevice(connection.id1);
      const device2 = this.getDevice(connection.id2);
      const edge = this.drawEdge(device1, device2);
      device1.addConnection(edge.id, device2.id);
      device2.addConnection(edge.id, device1.id);
    });
    console.log("Finished constructing ViewGraph");
  }

  // Add a device to the graph
  addDevice(deviceData: CreateDevice): Device {
    if (!this.devices.has(deviceData.id)) {
      const device = createDevice(deviceData, this);
      this.devices.set(device.id, device);
      this.viewport.addChild(device);
      console.log(`Device added with ID ${device.id}`);
    } else {
      console.warn(
        `Device with ID ${deviceData.id} already exists in the graph.`,
      );
    }
    return this.devices.get(deviceData.id);
  }

  drawEdge(device1: Device, device2: Device, edgeId?: EdgeId): Edge {
    // Usa el ID proporcionado o genera uno nuevo si no se especifica
    const id = edgeId ?? this.idCounter++;

    if (this.edges.has(id)) {
      console.warn(`Edge with ID ${id} already exists.`);
      return this.edges.get(id);
    }

    const edge = new Edge(
      id,
      { n1: device1.id, n2: device2.id },
      device1,
      device2,
      this,
    );

    this.edges.set(id, edge);
    this.viewport.addChild(edge);

    return edge;
  }

  addEdge(
    device1Id: DeviceId,
    device2Id: DeviceId,
    edgeId?: EdgeId,
  ): EdgeId | null {
    if (device1Id === device2Id) {
      console.warn(
        `Cannot create a connection between the same device (ID ${device1Id}).`,
      );
      return null;
    }

    if (!this.devices.has(device1Id)) {
      console.warn(`Device with ID ${device1Id} does not exist in devices.`);
      return null;
    }

    if (!this.devices.has(device2Id)) {
      console.warn(`Device with ID ${device2Id} does not exist in devices.`);
      return null;
    }

    // Check if an edge already exists between these two devices
    for (const edge of this.edges.values()) {
      const { n1, n2 } = edge.connectedNodes;
      if (
        (n1 === device1Id && n2 === device2Id) ||
        (n1 === device2Id && n2 === device1Id)
      ) {
        console.warn(
          `Connection between ID ${device1Id} and ID ${device2Id} already exists.`,
        );
        return null;
      }
    }

    const device1 = this.devices.get(device1Id);
    const device2 = this.devices.get(device2Id);

    if (device1 && device2) {
      // Use the provided edgeId if available, otherwise auto-generate one
      const edge = this.drawEdge(device1, device2, edgeId);

      this.datagraph.addEdge(device1Id, device2Id);

      console.log(
        `Connection created between devices ID: ${device1Id} and ID: ${device2Id} with Edge ID: ${edge.id}`,
      );

      return edge.id;
    }

    return null;
  }

  deviceMoved(deviceId: DeviceId) {
    const device: Device = this.devices.get(deviceId);
    device.getConnections().forEach((connection) => {
      const edge = this.edges.get(connection.edgeId);
      if (
        !(
          edge.connectedNodes.n1 == connection.adyacentId ||
          edge.connectedNodes.n2 == connection.adyacentId
        )
      ) {
        return;
      }
      // Get start and end devices directly
      const startDevice =
        edge.connectedNodes.n1 === device.id
          ? device
          : this.devices.get(connection.adyacentId);

      const endDevice =
        edge.connectedNodes.n1 === device.id
          ? this.devices.get(connection.adyacentId)
          : device;

      if (startDevice && endDevice) {
        edge.updatePosition(startDevice, endDevice);
      } else {
        console.warn("At least one device in connection does not exist");
      }
    });
    this.datagraph.updateDevicePosition(deviceId, { x: device.x, y: device.y });
  }

  getLayer(): Layer {
    return this.layer;
  }

  getSpeed(): SpeedMultiplier {
    if (!this.speedMultiplier) {
      this.speedMultiplier = new SpeedMultiplier(1);
    }
    return this.speedMultiplier;
  }

  setSpeed(speed: number) {
    if (this.speedMultiplier) {
      this.speedMultiplier.value = speed;
    } else {
      this.speedMultiplier = new SpeedMultiplier(speed);
    }
  }

  // Get all connections of a device
  getConnections(id: DeviceId): Edge[] {
    const device = this.devices.get(id);
    return device
      ? Array.from(device.connections.keys()).map((edgeId) =>
          this.edges.get(edgeId),
        )
      : [];
  }

  // Get a specific device by its ID
  getDevice(id: DeviceId): Device | undefined {
    return this.devices.get(id);
  }

  // Get all devices in the graph
  getDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  // Devuelve un array con solo los IDs de los dispositivos
  getDeviceIds(): DeviceId[] {
    return Array.from(this.devices.keys());
  }

  // Get the number of devices in the graph
  getDeviceCount(): number {
    return this.devices.size;
  }

  // Method to remove a device and its connections (edges)
  removeDevice(id: number) {
    const device = this.devices.get(id);

    if (!device) {
      console.warn(`Device with ID ${id} does not exist in the graph.`);
      return;
    }

    // Remove connection from adyacent’s devices
    device.getConnections().forEach((connection) => {
      const edge = this.edges.get(connection.edgeId);
      if (edge) {
        edge.delete();
      } else {
        console.warn(`Edge ${connection.edgeId} does not exist`);
      }
    });

    // Remove the device from the viewport and destroy it
    this.viewport.removeChild(device);

    // Finally, remove the device from the graph
    this.datagraph.removeDevice(id);
    this.devices.delete(id);

    console.log(`Device with ID ${id} and all its connections were removed.`);
  }

  // Method to remove a specific edge by its ID
  removeEdge(edgeId: EdgeId) {
    const edge = this.edges.get(edgeId);

    if (!edge) {
      console.warn(`Edge with ID ${edgeId} does not exist in the graph.`);
      return;
    }

    // Remove connection in DataGraph
    this.datagraph.removeConnection(
      edge.connectedNodes.n1,
      edge.connectedNodes.n2,
    );

    // Remove connection from each connected device
    const { n1, n2 } = edge.connectedNodes;
    const device1 = this.devices.get(n1);
    const device2 = this.devices.get(n2);

    if (!(device1 && device2)) {
      console.warn("At least one device in connection does not exist");
      return;
    }
    device1.removeConnection(edgeId);
    device2.removeConnection(edgeId);

    // Remove the edge from the viewport
    this.getViewport().removeChild(edge);

    // Remove the edge from the edges map in ViewGraph
    this.edges.delete(edgeId);

    console.log(`Edge with ID ${edgeId} successfully removed from ViewGraph.`);
  }

  getViewport() {
    return this.viewport;
  }

  getRoutingTable(id: DeviceId) {
    const device = this.datagraph.getDevice(id);
    if (!device || !isRouter(device)) {
      return [];
    }
    return device.routingTable;
  }

  // En ViewGraph
  getEdge(edgeId: EdgeId): Edge | undefined {
    return this.edges.get(edgeId);
  }

  // Para que las usen los moves de undo/redo
  // (la otra es tener dos funciones para agregar un dispositivo, una que avise al datagraph y otra que no)
  getDataGraph(): DataGraph {
    return this.datagraph;
  }

  /// Returns the IDs of the edges connecting the two devices
  getPathBetween(idA: DeviceId, idB: DeviceId): number[] {
    if (idA === idB) {
      return [];
    }
    const a = this.devices.get(idA);
    const b = this.devices.get(idB);
    if (!a || !b) {
      console.warn(`At least one device does not exist`);
      return [];
    }
    let current = a;
    const unvisitedNodes = [];
    const connectingEdges = new Map<DeviceId, EdgeId>([[a.id, null]]);
    while (current.id !== idB) {
      for (const [edgeId, adyacentId] of current.connections) {
        const edge = this.edges.get(edgeId);
        if (!connectingEdges.has(adyacentId)) {
          connectingEdges.set(adyacentId, edge.id);
          unvisitedNodes.push(this.devices.get(adyacentId));
        }
      }
      if (unvisitedNodes.length === 0) {
        return [];
      }
      current = unvisitedNodes.shift();
    }
    const path = [];
    while (current.id !== idA) {
      const edgeId = connectingEdges.get(current.id);
      path.push(edgeId);
      const edge = this.edges.get(edgeId);
      const parentId = edge.otherEnd(current.id);
      current = this.devices.get(parentId);
    }
    return path.reverse();
  }

  private layer_dfs(
    graph: Map<DeviceId, GraphNode>,
    s: number, // source node
    v: number,
    visited: Set<number>,
    connections: Set<string>,
  ) {
    graph.get(v).connections.forEach((w) => {
      if (!visited.has(w)) {
        const adyacent = this.datagraph.getDevice(w);
        // mark node as visited
        visited.add(w);

        if (layerIncluded(layerFromType(adyacent.type), this.layer)) {
          // add connection between v and w
          const connectionKey: string = generateConnectionKey(w, s);
          if (!connections.has(connectionKey)) {
            connections.add(connectionKey);
          }
        } else {
          // continue with recursive search
          this.layer_dfs(graph, s, w, visited, connections);
        }
      }
    });
  }
}
