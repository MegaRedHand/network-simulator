import { Device, NetworkDevice } from "./../devices";
import { Edge, EdgeEdges } from "./../edge";
import { DataGraph, DeviceId } from "./datagraph";
import { Viewport } from "../../graphics/viewport";
import { Layer, layerIncluded } from "../devices/layer";
import { CreateDevice, createDevice } from "../devices/utils";
import { layerFromType } from "../devices/device";
import { IpAddress } from "../../packets/ip";
import { GlobalContext } from "../../context";

export type EdgeId = string;

function parseConnectionKey(key: string): { id1: number; id2: number } {
  const connection: number[] = key
    .split(",")
    .map((value) => parseInt(value.trim()));
  return { id1: connection[0], id2: connection[1] };
}

export class ViewGraph {
  private ctx: GlobalContext;
  private devices: Map<DeviceId, Device> = new Map<DeviceId, Device>();
  private edges: Map<EdgeId, Edge> = new Map<EdgeId, Edge>();
  private datagraph: DataGraph;
  private layer: Layer;
  viewport: Viewport;

  constructor(datagraph: DataGraph, ctx: GlobalContext, layer: Layer) {
    this.ctx = ctx;
    this.datagraph = datagraph;
    this.viewport = ctx.getViewport();
    this.layer = layer;
    this.constructView();
  }

  private constructView() {
    console.log("Constructing ViewGraph from DataGraph");
    const allConnections = new Set<string>();

    for (const [deviceId, graphNode] of this.datagraph.getDevices()) {
      if (layerIncluded(layerFromType(graphNode.type), this.layer)) {
        const connections = this.datagraph.getConnections(deviceId);
        const deviceInfo = { id: deviceId, node: graphNode, connections };
        this.createDevice(deviceInfo);

        this.computeLayerConnections(deviceId, allConnections);
      }
    }

    this.addConnections(allConnections);
    console.log("Finished constructing ViewGraph");
  }

  addDevice(deviceData: CreateDevice) {
    const device = this.createDevice(deviceData);
    if (deviceData.connections.length !== 0) {
      const connections = new Set<string>();
      this.computeLayerConnections(deviceData.id, connections);

      this.addConnections(connections);
    }
    return device;
  }

  // Add a device to the graph
  private createDevice(deviceData: CreateDevice): Device {
    if (this.devices.has(deviceData.id)) {
      console.warn(
        `Device with ID ${deviceData.id} already exists in the graph.`,
      );
      return this.devices.get(deviceData.id);
    }
    const device = createDevice(deviceData, this);

    this.devices.set(device.id, device);
    this.viewport.addChild(device);
    console.log(`Device added with ID ${device.id}`);
    return this.devices.get(deviceData.id);
  }

  private addConnections(connections: Set<string>) {
    connections.forEach((key) => {
      const connection = parseConnectionKey(key);
      const device1 = this.getDevice(connection.id1);
      const device2 = this.getDevice(connection.id2);
      if (!(device1 && device2)) {
        console.warn("At least one device in connection does not exist");
        return;
      }
      this.drawEdge(device1, device2);
      device1.addConnection(device2.id);
      device2.addConnection(device1.id);
    });
  }

  drawEdge(device1: Device, device2: Device): Edge {
    const connectedNodes: EdgeEdges = { n1: device1.id, n2: device2.id };
    const id = Edge.generateConnectionKey(connectedNodes);
    if (this.edges.has(id)) {
      console.warn(`Edge with ID ${id} already exists.`);
      return this.edges.get(id);
    }

    const edge = new Edge(connectedNodes, device1, device2, this);

    this.edges.set(id, edge);
    this.viewport.addChild(edge);

    return edge;
  }

  addEdge(device1Id: DeviceId, device2Id: DeviceId): EdgeId | null {
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

    const device1 = this.devices.get(device1Id);
    const device2 = this.devices.get(device2Id);

    if (device1 && device2) {
      const edge = this.drawEdge(device1, device2);

      this.datagraph.addEdge(device1Id, device2Id);

      console.log(
        `Connection created between devices ID: ${device1Id} and ID: ${device2Id}`,
      );

      return Edge.generateConnectionKey(edge.connectedNodes);
    }

    return null;
  }

  deviceMoved(deviceId: DeviceId) {
    const device: Device = this.devices.get(deviceId);
    device.getConnections().forEach((adjacentId) => {
      const edge = this.edges.get(
        Edge.generateConnectionKey({ n1: deviceId, n2: adjacentId }),
      );
      // Get start and end devices directly
      const startDevice =
        edge.connectedNodes.n1 === device.id
          ? device
          : this.devices.get(adjacentId);

      const endDevice =
        edge.connectedNodes.n1 === device.id
          ? this.devices.get(adjacentId)
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

  changeCurrLayer(newLayer: Layer) {
    this.layer = newLayer;
    this.clear();
    this.constructView();
    const layerSelect = document.getElementById(
      "layer-select",
    ) as HTMLSelectElement;
    const event = new CustomEvent("layerChanged");
    layerSelect.dispatchEvent(event);
  }

  getSpeed(): number {
    return this.ctx.getCurrentSpeed().value;
  }

  // Get all connections of a device
  getConnections(id: DeviceId): Edge[] {
    const device = this.devices.get(id);
    if (!device) {
      return [];
    }
    const connections = device
      .getConnections()
      .map((adjacentId) =>
        this.edges.get(Edge.generateConnectionKey({ n1: id, n2: adjacentId })),
      );
    return connections;
  }

  // Get a specific device by its ID
  getDevice(id: DeviceId): Device | undefined {
    return this.devices.get(id);
  }

  // Get all devices in the graph
  getDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  // Returns an array of devices’ ids
  getDeviceIds(): DeviceId[] {
    return Array.from(this.devices.keys());
  }

  getAdjacentDeviceIds(id: DeviceId): DeviceId[] {
    return this.getDeviceIds().filter((adjId) => adjId !== id);
  }

  // Get the number of devices in the graph
  getDeviceCount(): number {
    return this.devices.size;
  }

  // Method to remove a device and its connections (edges)
  removeDevice(id: DeviceId) {
    const device = this.devices.get(id);

    if (!device) {
      console.warn(`Device with ID ${id} does not exist in the graph.`);
      return;
    }

    // Remove connection from adjacent’s devices
    device.getConnections().forEach((adjacentId) => {
      const edgeId = Edge.generateConnectionKey({ n1: id, n2: adjacentId });
      const edge = this.edges.get(edgeId);
      if (edge) {
        edge.delete();
      } else {
        console.warn(`Edge ${edgeId} does not exist`);
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
    device1.removeConnection(n2);
    device2.removeConnection(n1);

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
    return this.datagraph.getRoutingTable(id);
  }

  getEdge(edgeId: EdgeId): Edge | undefined {
    return this.edges.get(edgeId);
  }

  getDataGraph(): DataGraph {
    return this.datagraph;
  }

  getDeviceByIP(ipAddress: IpAddress) {
    return this.getDevices().find((device) => {
      return device instanceof NetworkDevice && device.ip == ipAddress;
    });
  }

  /// Returns shortest path between two devices using BFS
  getPathBetween(startId: DeviceId, endId: DeviceId): DeviceId[] {
    // try to avoid having a host in the middle of the path
    if (startId === endId) {
      return [];
    }
    const startDevice = this.devices.get(startId);
    if (!(this.devices.has(startId) && this.devices.has(endId))) {
      console.warn(`At least one device does not exist`);
      return [];
    }
    const queue: [Device, DeviceId[]][] = [[startDevice, [startId]]];
    const visited: Set<DeviceId> = new Set<DeviceId>();

    while (queue.length > 0) {
      const [device, path] = queue.shift();

      if (device.id === endId) {
        return path;
      }

      if (!visited.has(device.id)) {
        visited.add(device.id);
        device.getConnections().forEach((adjId) => {
          const adjDevice = this.devices.get(adjId);
          if (!adjDevice) {
            console.warn(`Device ${adjId} for path not found in viewgraph`);
            return;
          }
          if (!visited.has(adjId)) {
            queue.push([adjDevice, [...path, adjId]]);
          }
        });
      }
    }
    console.log(`Path between devices ${startId} and ${endId} not found`);
    return null;
  }

  private computeLayerConnections(source: DeviceId, connections: Set<string>) {
    this.layer_dfs(
      this.datagraph,
      source,
      source,
      new Set([source]),
      connections,
    );
  }

  private layer_dfs(
    graph: DataGraph,
    s: DeviceId, // source node
    v: DeviceId,
    visited: Set<DeviceId>,
    connections: Set<string>,
  ) {
    graph.getConnections(v).forEach((w) => {
      if (visited.has(w)) {
        return;
      }
      const adjacent = this.datagraph.getDevice(w);
      // mark node as visited
      visited.add(w);

      if (layerIncluded(layerFromType(adjacent.type), this.layer)) {
        // add connection between s and w
        const connectionKey: string = Edge.generateConnectionKey({
          n1: w,
          n2: s,
        });
        if (!connections.has(connectionKey)) {
          connections.add(connectionKey);
        }
      } else {
        // continue with recursive search
        this.layer_dfs(graph, s, w, visited, connections);
      }
    });
  }

  clear() {
    this.viewport.clear();
    this.devices.forEach((device) => device.destroy());
    this.devices.clear();
    this.edges.forEach((edge) => edge.destroy());
    this.edges.clear();
  }
}
