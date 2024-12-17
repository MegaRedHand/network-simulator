import { Device } from "./../devices/index"; // Import the Device class
import { Edge } from "./../edge";
import { DataGraph, GraphNode } from "./datagraph";
import { Viewport } from "../../graphics/viewport";
import { Layer } from "../devices/device";
import { createDevice, layerFromType, layerIncluded } from "../devices/utils";

interface Connection {
  id1: number;
  id2: number;
}

export class ViewGraph {
  private devices: Map<number, Device> = new Map<number, Device>();
  private edges: Map<number, Edge> = new Map<number, Edge>();
  private idCounter = 1;
  private datagraph: DataGraph;
  private layer: Layer;
  viewport: Viewport;

  constructor(datagraph: DataGraph, viewport: Viewport, layer: Layer) {
    this.datagraph = datagraph;
    this.viewport = viewport;
    this.layer = layer;
    this.constructView();
  }

  private constructView() {
    // TODO: Adjust construction based on the selected layer in the future
    console.log("Constructing ViewGraph from DataGraph");
    const connections = new Set<Connection>();

    this.datagraph.getDevices().forEach(([deviceId, graphNode]) => {
      if (layerIncluded(layerFromType(graphNode.type), this.layer)) {
        const deviceInfo = { ...graphNode, id: deviceId };
        const device: Device = createDevice(deviceInfo, this);

        this.viewport.addChild(device);

        this.addDevice(device);

        this.layer_dfs(
          this.datagraph.devices,
          deviceId,
          deviceId,
          new Set([deviceId]),
          connections,
        );
        // graphNode.connections.forEach((adyacentId) => {
        //   if (!connections.has({ id1: adyacentId, id2: deviceId })) {
        //     connections.add({ id1: deviceId, id2: adyacentId });
        //   }
        // });
      }
    });

    console.log("Finished creating devices in ViewGraph, connections are");
    console.log(connections);
    connections.forEach(({ id1, id2 }) => {
      console.log(`${id1}, ${id2}`);
      const device1 = this.getDevice(id1);
      const device2 = this.getDevice(id2);
      device1.connectTo(device2.id);
    });
    console.log("Finished constructing ViewGraph");
  }

  // Add a device to the graph
  addDevice(device: Device) {
    if (!this.devices.has(device.id)) {
      this.devices.set(device.id, device);
      console.log(`Device added with ID ${device.id}`);
    } else {
      console.warn(`Device with ID ${device.id} already exists in the graph.`);
    }
  }

  // Add a connection between two devices
  addEdge(device1Id: number, device2Id: number): number | null {
    if (device1Id === device2Id) {
      console.warn(
        `Cannot create a connection between the same device (ID ${device1Id}).`,
      );
      return null;
    }

    if (!this.devices.has(device1Id)) {
      console.warn(`Device with ID ${device1Id} does not exist in devices.`);
    } else if (!this.devices.has(device2Id)) {
      console.warn(`Device with ID ${device2Id} does not exist in devices.`);
    } else {
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
        const edge = new Edge(
          this.idCounter++,
          { n1: device1Id, n2: device2Id },
          device1,
          device2,
          this,
        );
        this.edges.set(edge.id, edge);

        this.datagraph.addEdge(device1Id, device2Id);
        this.viewport.addChild(edge);

        console.log(
          `Connection created between devices ID: ${device1Id} and ID: ${device2Id}`,
        );

        return edge.id;
      }
    }
    return null;
  }

  deviceMoved(deviceId: number) {
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
      }
    });
    this.datagraph.updateDevicePosition(deviceId, { x: device.x, y: device.y });
  }

  // Get all connections of a device
  getConnections(id: number): Edge[] {
    const device = this.devices.get(id);
    return device ? Array.from(this.edges.values()) : [];
  }

  // Get a specific device by its ID
  getDevice(id: number): Device | undefined {
    return this.devices.get(id);
  }

  // Get all devices in the graph
  getDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  // Devuelve un array con solo los IDs de los dispositivos
  getDeviceIds(): number[] {
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

    device.getConnections().forEach((connection) => {
      const adyacentDevice = this.devices.get(connection.adyacentId);
      const edge = this.edges.get(connection.edgeId);
      if (edge) {
        if (adyacentDevice) {
          adyacentDevice.removeConnection(edge.id);
        }
        edge.delete();
      }
    });

    // Remove the device from the viewport and destroy it
    this.viewport.removeChild(device);
    device.destroy();

    // Finally, remove the device from the graph
    this.datagraph.removeDevice(id);
    this.devices.delete(id);
    console.log(`Device with ID ${id} and all its connections were removed.`);
  }

  // Method to remove a specific edge by its ID
  removeEdge(edgeId: number) {
    const edge = this.edges.get(edgeId);

    if (!edge) {
      console.warn(`Edge with ID ${edgeId} does not exist in the graph.`);
      return;
    }

    this.datagraph.removeConnection(
      edge.connectedNodes.n1,
      edge.connectedNodes.n2,
    );
    // Call Edge's remove method to handle disconnection and cleanup
    edge.remove();

    // Remove the edge from the edges map in ViewGraph
    this.edges.delete(edgeId);

    console.log(`Edge with ID ${edgeId} successfully removed from ViewGraph.`);
  }

  getViewport() {
    return this.viewport;
  }

  // En ViewGraph
  getEdge(edgeId: number): Edge | undefined {
    return this.edges.get(edgeId);
  }

  /// Returns the IDs of the edges connecting the two devices
  getPathBetween(idA: number, idB: number): number[] {
    if (idA === idB) {
      return [];
    }
    const a = this.devices.get(idA);
    const b = this.devices.get(idB);
    if (!a || !b) {
      return [];
    }
    let current = a;
    const unvisitedNodes = [];
    const connectingEdges = new Map<number, number>([[a.id, null]]);
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
    graph: Map<number, GraphNode>,
    s: number, // source node
    v: number,
    visited: Set<number>,
    connections: Set<Connection>,
  ) {
    const node = this.datagraph.getDevice(v);
    graph.get(v).connections.forEach((w) => {
      console.log(`Se accede a ${w} desde ${v}`);
      if (!visited.has(w)) {
        console.log(`Se visita ${w}`);
        const adyacent = this.datagraph.getDevice(w);
        // mark node as visited
        visited.add(w);
        if (layerIncluded(layerFromType(adyacent.type), this.layer)) {
          // add connection between v and w
          const connection: Connection = { id1: w, id2: s };
          if (!connections.has(connection)) {
            console.log(`Dispositivos agregados a conexion`);
            connections.add({ id1: s, id2: w });
          }
        } else {
          // continue with recursive search
          this.layer_dfs(graph, s, w, visited, connections);
        }
      }
    });
  }
}
