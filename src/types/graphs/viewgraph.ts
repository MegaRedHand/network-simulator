import { ViewDevice } from "../view-devices";
import { Edge, EdgeEdges } from "./../edge";
import { DataGraph, DeviceId, DataNode, RemovedNodeData } from "./datagraph";
import { Viewport } from "../../graphics/viewport";
import { Layer, layerIncluded } from "../layer";
import { createViewDevice } from "../view-devices/utils";
import { layerFromType } from "../view-devices/vDevice";
import { IpAddress } from "../../packets/ip";
import { GlobalContext } from "../../context";
import { Graph } from "./graph";
import { PacketManager } from "../packetManager";
import { ViewNetworkDevice } from "../view-devices/vNetworkDevice";
import { MacAddress } from "../../packets/ethernet";

export type EdgePair = [DeviceId, DeviceId];

export class ViewGraph {
  ctx: GlobalContext;
  graph = new Graph<ViewDevice, Edge>();
  private datagraph: DataGraph;
  private packetManager: PacketManager;
  private layer: Layer;
  viewport: Viewport;

  constructor(datagraph: DataGraph, ctx: GlobalContext, layer: Layer) {
    this.ctx = ctx;
    this.datagraph = datagraph;
    this.viewport = ctx.getViewport();
    this.layer = layer;
    this.packetManager = new PacketManager(this);
    this.constructView();
  }

  private constructView() {
    console.log("Constructing ViewGraph from DataGraph");
    const allConnections = new Map<string, EdgePair>();

    for (const [deviceId, device] of this.datagraph.getDevices()) {
      if (layerIncluded(layerFromType(device.getType()), this.layer)) {
        this.addDevice(deviceId, device.getDataNode());
        layerDFS(
          this.datagraph,
          this.layer,
          deviceId,
          deviceId,
          new Set([deviceId]),
          allConnections,
        );
      }
    }
    console.debug(allConnections);
    this.addConnections(allConnections);
  }

  loadDevice(deviceId: DeviceId): ViewDevice {
    const node = this.datagraph.getDevice(deviceId);
    const device = this.addDevice(deviceId, node.getDataNode());

    // load connections
    const connections = new Map<string, EdgePair>();
    layerDFS(
      this.datagraph,
      this.layer,
      deviceId,
      deviceId,
      new Set([deviceId]),
      connections,
    );
    this.addConnections(connections);
    return device;
  }

  // Add a device to the graph
  private addDevice(id: DeviceId, node: DataNode): ViewDevice {
    if (!node.id) {
      console.warn("Device does not hace ID");
    }
    if (this.graph.hasVertex(id)) {
      console.warn(`Device with ID ${id} already exists in the graph.`);
      return this.graph.getVertex(id);
    }
    const device = createViewDevice(node, this, this.ctx);

    this.graph.setVertex(device.id, device);
    this.viewport.addChild(device);
    console.log(`Device added with ID ${device.id}`);
    return this.graph.getVertex(id);
  }

  private addConnections(connections: Map<string, EdgePair>) {
    connections.forEach(([id1, id2]) => {
      const device1 = this.getDevice(id1);
      const device2 = this.getDevice(id2);
      if (!(device1 && device2)) {
        console.warn("At least one device in connection does not exist");
        return;
      }
      this.drawEdge(device1, device2);
    });
  }

  drawEdge(device1: ViewDevice, device2: ViewDevice): Edge {
    const connectedNodes: EdgeEdges = { n1: device1.id, n2: device2.id };
    if (this.graph.hasEdge(device1.id, device2.id)) {
      console.warn(`Edge with ID ${device1.id},${device2.id} already exists.`);
      return this.graph.getEdge(device1.id, device2.id);
    }

    const edge = new Edge(connectedNodes, device1, device2, this);

    this.graph.setEdge(device1.id, device2.id, edge);
    this.viewport.addChild(edge);

    return edge;
  }

  addEdge(device1Id: DeviceId, device2Id: DeviceId): EdgePair | null {
    if (device1Id === device2Id) {
      console.warn(
        `Cannot create a connection between the same device (ID ${device1Id}).`,
      );
      return null;
    }

    if (!this.graph.hasVertex(device1Id)) {
      console.warn(`Device with ID ${device1Id} does not exist in devices.`);
      return null;
    }

    if (!this.graph.hasVertex(device2Id)) {
      console.warn(`Device with ID ${device2Id} does not exist in devices.`);
      return null;
    }

    const device1 = this.graph.getVertex(device1Id);
    const device2 = this.graph.getVertex(device2Id);

    if (device1 && device2) {
      const edge = this.drawEdge(device1, device2);

      this.datagraph.addEdge(device1Id, device2Id);

      console.log(
        `Connection created between devices ID: ${device1Id} and ID: ${device2Id}`,
      );

      return [edge.connectedNodes.n1, edge.connectedNodes.n2];
    }

    return null;
  }

  deviceMoved(deviceId: DeviceId) {
    const device: ViewDevice = this.graph.getVertex(deviceId);
    this.graph.getNeighbors(deviceId).forEach((adjacentId) => {
      const edge = this.graph.getEdge(deviceId, adjacentId);
      // Get start and end devices directly
      const startDevice =
        edge.connectedNodes.n1 === device.id
          ? device
          : this.graph.getVertex(adjacentId);

      const endDevice =
        edge.connectedNodes.n1 === device.id
          ? this.graph.getVertex(adjacentId)
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
    const formerLayer = this.layer;
    this.layer = newLayer;
    this.clear();
    this.constructView();

    // warn Packet Manager that the layer has been changed
    this.packetManager.layerChanged(formerLayer, newLayer);

    const event = new CustomEvent("layerChanged", {
      detail: { layer: newLayer },
    });
    document.dispatchEvent(event);
  }

  getSpeed(): number {
    return this.ctx.getCurrentSpeed();
  }

  // Get all connections of a device
  getConnections(id: DeviceId): Edge[] {
    const edges = this.graph.getEdges(id);
    if (!edges) {
      return [];
    }
    return Array.from(edges).map(([, edge]) => edge);
  }

  getAllConnections(): Edge[] {
    return Array.from(this.graph.getAllEdges()).map(([, , edge]) => edge);
  }

  // Get a specific device by its ID
  getDevice(id: DeviceId): ViewDevice | undefined {
    return this.graph.getVertex(id);
  }

  // Get all devices in the graph
  getDevices(): ViewDevice[] {
    return Array.from(this.graph.getAllVertices()).map(([, device]) => device);
  }

  // Returns an array of devices’ ids
  getDeviceIds(): DeviceId[] {
    return Array.from(this.graph.getAllVertices()).map(([id]) => id);
  }

  // Get the number of devices in the graph
  getDeviceCount(): number {
    return this.graph.getVertexCount();
  }

  getPacketManager(): PacketManager {
    return this.packetManager;
  }

  /**
   * Remove a device and its connections from the viewgraph and its underlying datagraph.
   */
  // Method to remove a device and its connections (edges)
  removeDevice(id: DeviceId): RemovedNodeData | undefined {
    const device = this.graph.getVertex(id);

    if (!device) {
      console.warn(`Device with ID ${id} does not exist in the graph.`);
      return;
    }

    this.graph.getNeighbors(id).forEach((adjacentId) => {
      this._removeEdge(id, adjacentId);
    });

    // Remove device and its connections from the graph
    this.graph.removeVertex(id);

    // Remove the device from the viewport and destroy it
    this.viewport.removeChild(device);

    // Finally, remove the device from the datagraph
    const removedData = this.datagraph.removeDevice(id);

    console.log(`Device with ID ${id} removed from view.`);
    return removedData;
  }

  /**
   * Remove the edge between two devices from the viewgraph and its underlying datagraph.
   */
  removeEdge(n1Id: DeviceId, n2Id: DeviceId): boolean {
    const datagraphEdge = this.datagraph.getConnection(n1Id, n2Id);

    if (!datagraphEdge) {
      console.warn(`Edge ${n1Id},${n2Id} is not in the datagraph`);
      return false;
    }
    // Remove connection in DataGraph
    this.datagraph.removeConnection(n1Id, n2Id);

    return this._removeEdge(n1Id, n2Id);
  }

  /**
   * Removes the edge from the viewgraph without removing from the Datagraph.
   */
  private _removeEdge(n1Id: DeviceId, n2Id: DeviceId): boolean {
    const edge = this.graph.getEdge(n1Id, n2Id);
    if (!edge) {
      console.warn(`Edge ${n1Id},${n2Id} is not in the viewgraph.`);
      return false;
    }

    // Remove connection from each connected device
    const { n1, n2 } = edge.connectedNodes;
    const device1 = this.graph.getVertex(n1);
    const device2 = this.graph.getVertex(n2);

    if (!(device1 && device2)) {
      console.warn("At least one device in connection does not exist");
      return false;
    }

    // Remove the edge from the viewport
    this.getViewport().removeChild(edge);

    // Remove the edge from the edges map in ViewGraph
    this.graph.removeEdge(n1Id, n2Id);

    console.log(
      `Edge with ID ${n1Id},${n2Id} successfully removed from ViewGraph.`,
    );
    return true;
  }

  getViewport() {
    return this.viewport;
  }

  getRoutingTable(id: DeviceId) {
    return this.datagraph.getRoutingTable(id);
  }

  getEdge(n1Id: DeviceId, n2Id: DeviceId): Edge | undefined {
    return this.graph.getEdge(n1Id, n2Id);
  }

  getDataGraph(): DataGraph {
    return this.datagraph;
  }

  getDeviceByIP(ipAddress: IpAddress) {
    return this.getDevices().find((device) => {
      return device instanceof ViewNetworkDevice && device.ip.equals(ipAddress);
    });
  }

  getDeviceByMac(destination: MacAddress): ViewDevice {
    return this.getDevices().find((device) => {
      return device.mac.equals(destination);
    });
  }

  hasDevice(id: DeviceId) {
    return this.graph.hasVertex(id);
  }

  setDataGraph(datagraph: DataGraph): void {
    this.datagraph = datagraph;
  }

  /// Returns shortest path between two devices using BFS
  getPathBetween(startId: DeviceId, endId: DeviceId): DeviceId[] {
    // try to avoid having a host in the middle of the path
    if (startId === endId) {
      return [];
    }
    const startDevice = this.graph.getVertex(startId);
    if (!(this.graph.hasVertex(startId) && this.graph.hasVertex(endId))) {
      console.warn(`At least one device does not exist`);
      return [];
    }
    const queue: [ViewDevice, DeviceId[]][] = [[startDevice, [startId]]];
    const visited: Set<DeviceId> = new Set<DeviceId>();

    while (queue.length > 0) {
      const [device, path] = queue.shift();

      if (device.id === endId) {
        return path;
      }

      if (!visited.has(device.id)) {
        visited.add(device.id);
        this.graph.getNeighbors(device.id).forEach((adjId) => {
          const adjDevice = this.graph.getVertex(adjId);
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

  clear() {
    this.viewport.clear();
    for (const [, device] of this.graph.getAllVertices()) {
      device.destroy();
    }
    for (const [, , edge] of this.graph.getAllEdges()) {
      edge.destroy();
    }
    this.graph.clear();
  }

  // Make all edges transparent except for the ones connected to the device
  transparentEdgesForDevice(id: DeviceId) {
    for (const [, , edge] of this.graph.getAllEdges()) {
      if (edge.connectedNodes.n1 !== id && edge.connectedNodes.n2 !== id) {
        edge.becomeTransparent();
      }
    }
  }

  // Make all edges transparent except for the edge between the two devices
  transparentEdgesForEdge(n1: DeviceId, n2: DeviceId) {
    for (const [, , edge] of this.graph.getAllEdges()) {
      if (
        (edge.connectedNodes.n1 !== n1 || edge.connectedNodes.n2 !== n2) &&
        (edge.connectedNodes.n1 !== n2 || edge.connectedNodes.n2 !== n1)
      ) {
        edge.becomeTransparent();
      }
    }
  }

  untransparentEdges() {
    for (const [, , edge] of this.graph.getAllEdges()) {
      edge.becomeOpaque();
    }
  }
}

function layerDFS(
  datagraph: DataGraph,
  layer: Layer,
  s: DeviceId, // source node
  v: DeviceId,
  visited: Set<DeviceId>,
  connections: Map<string, EdgePair>,
) {
  datagraph.getConnections(v).forEach((w) => {
    if (visited.has(w)) {
      return;
    }
    const adjacent = datagraph.getDevice(w);
    // mark node as visited
    visited.add(w);

    if (layerIncluded(layerFromType(adjacent.getType()), layer)) {
      // NOTE: we use strings because according to JavaScript, [1, 2] !== [1, 2]
      const edgePair: EdgePair = [w, s];
      edgePair.sort();
      connections.set(edgePair.toString(), edgePair);
    } else {
      // continue with recursive search
      layerDFS(datagraph, layer, s, w, visited, connections);
    }
  });
}
