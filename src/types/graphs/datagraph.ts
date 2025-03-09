import { RunningProgram } from "../../programs";
import { DeviceType, Layer, layerFromType } from "../devices/device";
import { layerIncluded } from "../devices/layer";
import { Graph, VertexId } from "./graph";

export type DeviceId = VertexId;

interface LinkGraphNode extends CommonDataNode {
  mac: string;
  arpTable: Map<string, string>;
}

interface NetworkGraphNode extends LinkGraphNode {
  ip: string;
  mask: string;
}

interface RouterGraphNode extends NetworkGraphNode {
  type: DeviceType.Router;
  routingTable: RoutingTableEntry[];
}

export interface RoutingTableEntry {
  ip: string;
  mask: string;
  iface: DeviceId;
  manuallyEdited?: boolean;
  deleted?: boolean;
}

interface HostGraphNode extends NetworkGraphNode {
  type: DeviceType.Host;
  runningPrograms: RunningProgram[];
}

interface SwitchGraphNode extends LinkGraphNode {
  type: DeviceType.Switch;
}

// Typescript type guard
export function isRouter(node: GraphNode): node is RouterGraphNode {
  return node.type === DeviceType.Router;
}

export function isHost(node: GraphNode): node is HostGraphNode {
  return node.type === DeviceType.Host;
}

export function isSwitch(node: GraphNode): node is SwitchGraphNode {
  return node.type === DeviceType.Switch;
}

export function isNetworkNode(node: GraphNode): node is NetworkGraphNode {
  return layerIncluded(layerFromType(node.type), Layer.Network);
}

export function isLinkNode(node: GraphNode): node is LinkGraphNode {
  return layerIncluded(layerFromType(node.type), Layer.Link);
}

export type GraphNode =
  | CommonDataNode
  | RouterGraphNode
  | HostGraphNode
  | SwitchGraphNode;

// STORAGE DATA TYPES

export type GraphDataNode =
  | CommonDataNode
  | RouterDataNode
  | HostDataNode
  | SwitchDataNode;

interface CommonDataNode {
  id: DeviceId;
  x: number;
  y: number;
  type: DeviceType;
}

interface LinkDataNode extends CommonDataNode {
  mac: string;
  arpTable: Map<string, string>;
}

interface NetworkDataNode extends LinkDataNode {
  ip: string;
  mask: string;
}

interface RouterDataNode extends NetworkDataNode {
  type: DeviceType.Router;
  routingTable: RoutingTableEntry[];
}

interface HostDataNode extends NetworkDataNode {
  type: DeviceType.Host;
  runningPrograms: RunningProgram[];
}

interface SwitchDataNode extends LinkDataNode {
  type: DeviceType.Switch;
}

interface EdgeTip {
  id: DeviceId;
  // TODO: uncomment this
  // iface: number;
}

interface GraphEdge {
  from: EdgeTip;
  to: EdgeTip;
}

export interface GraphData {
  nodes: GraphDataNode[];
  edges: GraphEdge[];
}

export interface NewDevice {
  x: number;
  y: number;
  type: DeviceType;
  ip?: string;
  mask?: string;
  mac?: string;
}

export class DataGraph {
  // NOTE: we don't store data in edges yet
  private deviceGraph = new Graph<GraphNode, GraphEdge>();
  private idCounter: DeviceId = 1;
  private onChanges: (() => void)[] = [];

  static fromData(data: GraphData): DataGraph {
    const dataGraph = new DataGraph();

    data.nodes.forEach((nodeData: GraphDataNode) => {
      console.log(nodeData);

      let graphNode: GraphNode = nodeData;

      if (isRouter(nodeData)) {
        // If the node is a router, include the routing table
        graphNode = {
          ...nodeData,
          routingTable: nodeData.routingTable || [], // Ensure routingTable exists
        };
      }

      dataGraph.addDevice(nodeData.id, graphNode, []);
    });

    data.edges.forEach((edgeData: GraphEdge) => {
      dataGraph.deviceGraph.setEdge(edgeData.from.id, edgeData.to.id, edgeData);
    });

    return dataGraph;
  }

  toData(): GraphData {
    const nodes: GraphDataNode[] = [];
    const edges: GraphEdge[] = [];

    // Serialize nodes
    for (const [, node] of this.deviceGraph.getAllVertices()) {
      nodes.push(node);
    }
    for (const [, , edge] of this.deviceGraph.getAllEdges()) {
      edges.push(edge);
    }
    return { nodes, edges };
  }

  // Add a new device to the graph
  addNewDevice(deviceInfo: NewDevice): DeviceId {
    const id = this.idCounter++;
    const graphnode: GraphNode = {
      ...deviceInfo,
      id,
    };
    if (isRouter(graphnode)) {
      graphnode.routingTable = [];
    }
    if (isSwitch(graphnode)) {
      graphnode.arpTable = new Map();
    }
    if (isHost(graphnode)) {
      graphnode.runningPrograms = [];
    }
    this.deviceGraph.setVertex(id, graphnode);
    console.log(`Device added with ID ${id}`);
    this.notifyChanges();
    return id;
  }

  // Add a device to the graph
  addDevice(
    idDevice: DeviceId,
    deviceInfo: GraphNode,
    connections: DeviceId[],
  ) {
    if (this.deviceGraph.hasVertex(idDevice)) {
      console.warn(`Device with ID ${idDevice} already exists in the graph.`);
      return;
    }
    this.deviceGraph.setVertex(idDevice, deviceInfo);
    connections.forEach((connectedId) => {
      const edge = { from: { id: idDevice }, to: { id: connectedId } };
      this.deviceGraph.setEdge(idDevice, connectedId, edge);
    });
    if (this.idCounter <= idDevice) {
      this.idCounter = idDevice + 1;
    }
    console.log(`Device added with ID ${idDevice}`);
    this.notifyChanges();
  }

  // Add a connection between two devices
  addEdge(n1Id: DeviceId, n2Id: DeviceId) {
    if (n1Id === n2Id) {
      console.warn(
        `Cannot create a connection between the same device (ID ${n1Id}).`,
      );
      return;
    }
    if (!this.deviceGraph.hasVertex(n1Id)) {
      console.warn(`Device with ID ${n1Id} does not exist.`);
      return;
    }
    if (!this.deviceGraph.hasVertex(n2Id)) {
      console.warn(`Device with ID ${n2Id} does not exist.`);
      return;
    }
    if (this.deviceGraph.hasEdge(n1Id, n2Id)) {
      console.warn(
        `Connection between ID ${n1Id} and ID ${n2Id} already exists.`,
      );
      return;
    }
    const edge = { from: { id: n1Id }, to: { id: n2Id } };
    this.deviceGraph.setEdge(n1Id, n2Id, edge);

    console.log(
      `Connection created between devices ID: ${n1Id} and ID: ${n2Id}`,
    );
    this.notifyChanges();
    this.regenerateAllRoutingTables();
  }

  updateDevicePosition(id: DeviceId, newValues: { x?: number; y?: number }) {
    const deviceGraphNode = this.deviceGraph.getVertex(id);
    if (!deviceGraphNode) {
      console.warn("Device's id is not registered");
      return;
    }
    this.deviceGraph.setVertex(id, { ...deviceGraphNode, ...newValues });
    this.notifyChanges();
  }

  // Get a device by its ID.
  // WARNING: don't modify the device directly, use `modifyDevice` instead
  getDevice(id: DeviceId): GraphNode | undefined {
    return this.deviceGraph.getVertex(id);
  }

  // Modify a device in the graph, notifying subscribers of any changes
  modifyDevice(id: DeviceId, fn: (d: GraphNode | undefined) => void) {
    const device = this.deviceGraph.getVertex(id);
    fn(device);
    if (device) {
      this.notifyChanges();
    }
  }

  // Get all devices in the graph
  getDevices(): IterableIterator<[DeviceId, GraphNode]> {
    return this.deviceGraph.getAllVertices();
  }

  // Get the number of devices in the graph
  getDeviceCount(): number {
    return this.deviceGraph.getVertexCount();
  }

  // Get all connections of a device
  getConnections(id: DeviceId): DeviceId[] | undefined {
    return this.deviceGraph.getNeighbors(id);
  }

  // Method to remove a device and all its connections
  removeDevice(id: DeviceId): void {
    if (!this.deviceGraph.hasVertex(id)) {
      console.warn(`Device with ID ${id} does not exist in the graph.`);
      return;
    }
    this.deviceGraph.removeVertex(id);
    console.log(`Device with ID ${id} and its connections were removed.`);
    this.notifyChanges();
    this.regenerateAllRoutingTables();
  }

  // Method to remove a connection (edge) between two devices by their IDs
  removeConnection(n1Id: DeviceId, n2Id: DeviceId): void {
    this.deviceGraph.removeEdge(n1Id, n2Id);

    console.log(
      `Connection removed between devices ID: ${n1Id} and ID: ${n2Id}`,
    );
    this.notifyChanges();
    this.regenerateAllRoutingTables();
  }

  subscribeChanges(callback: () => void) {
    this.onChanges.push(callback);
  }

  notifyChanges() {
    this.onChanges.forEach((callback) => callback());
  }

  regenerateAllRoutingTables() {
    console.log("Regenerating all routing tables");
    for (const [id] of this.deviceGraph.getAllVertices()) {
      this.regenerateRoutingTable(id);
    }
  }

  regenerateRoutingTableClean(id: DeviceId): RoutingTableEntry[] {
    return this.generateRoutingTable(id);
  }

  regenerateRoutingTable(id: DeviceId) {
    const router = this.deviceGraph.getVertex(id);
    if (!isRouter(router)) return;

    router.routingTable = this.generateRoutingTable(id, true);
  }

  private generateRoutingTable(
    id: DeviceId,
    preserveEdits = false,
  ): RoutingTableEntry[] {
    const router = this.deviceGraph.getVertex(id);
    if (!isRouter(router)) {
      return [];
    }

    const parents = new Map<DeviceId, DeviceId>();
    parents.set(id, id);
    const queue = [id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      const current = this.deviceGraph.getVertex(currentId);
      if (isHost(current)) continue;

      const neighbors = this.deviceGraph.getNeighbors(currentId);
      neighbors.forEach((connectedId) => {
        if (!parents.has(connectedId)) {
          parents.set(connectedId, currentId);
          queue.push(connectedId);
        }
      });
    }

    const newTable: RoutingTableEntry[] = [];

    parents.forEach((currentId, childId) => {
      const dstId = childId;
      if (dstId === id) return;

      while (currentId !== id) {
        const parentId = parents.get(currentId);
        childId = currentId;
        currentId = parentId;
      }

      const dst = this.deviceGraph.getVertex(dstId);

      if (isNetworkNode(dst)) {
        newTable.push({
          ip: dst.ip,
          mask: dst.mask,
          iface: childId,
        });
      }
    });

    if (preserveEdits) {
      router.routingTable.forEach((manualEntry) => {
        if (manualEntry.manuallyEdited) {
          const existingEntry = newTable.find(
            (entry) => entry.ip === manualEntry.ip,
          );
          if (existingEntry) {
            existingEntry.mask = manualEntry.mask;
            existingEntry.iface = manualEntry.iface;
            existingEntry.manuallyEdited = true;
          } else {
            newTable.push({ ...manualEntry });
          }
        }
      });

      router.routingTable.forEach((deletedEntry) => {
        if (deletedEntry.deleted) {
          const index = newTable.findIndex(
            (entry) => entry.ip === deletedEntry.ip,
          );
          if (index !== -1) {
            newTable[index] = deletedEntry;
            console.log(`Preserving deleted entry:`, deletedEntry);
          } else {
            newTable.push(deletedEntry);
          }
        }
      });
    }

    console.log(`Generated routing table for router ID ${id}:`, newTable);
    return newTable;
  }

  saveManualChange(
    routerId: DeviceId,
    visibleRowIndex: number, // Este es el índice en la UI
    colIndex: number,
    newValue: string,
  ) {
    const router = this.getDevice(routerId);
    if (!router || !isRouter(router)) {
      console.warn(`Device with ID ${routerId} is not a router.`);
      return;
    }

    // Obtener solo las entradas visibles (no eliminadas)
    const visibleEntries = router.routingTable.filter(
      (entry) => !entry.deleted,
    );

    // Validar que el índice de la UI es correcto
    if (visibleRowIndex < 0 || visibleRowIndex >= visibleEntries.length) {
      console.warn(`Invalid row index: ${visibleRowIndex}`);
      return;
    }

    // Buscar la entrada real en router.routingTable
    const realEntry = visibleEntries[visibleRowIndex];

    // Encontrar su índice en la tabla original
    const realIndex = router.routingTable.findIndex(
      (entry) => entry === realEntry,
    );
    if (realIndex === -1) {
      console.warn(`Could not find matching entry in original routingTable`);
      return;
    }

    // Aplicar el cambio en la entrada correcta
    switch (colIndex) {
      case 0:
        router.routingTable[realIndex].ip = newValue;
        break;
      case 1:
        router.routingTable[realIndex].mask = newValue;
        break;
      case 2:
        router.routingTable[realIndex].iface = newValue.startsWith("eth")
          ? parseInt(newValue.replace("eth", ""), 10)
          : parseInt(newValue, 10);
        break;
      default:
        console.warn(`Invalid column index: ${colIndex}`);
        return;
    }

    // Marcar la entrada como editada manualmente
    router.routingTable[realIndex].manuallyEdited = true;
    console.log(
      `Updated router ID ${routerId} routing table entry at [${realIndex}, ${colIndex}] manually`,
    );

    this.notifyChanges();
  }

  setRoutingTable(
    routerId: DeviceId,
    newRoutingTable: RoutingTableEntry[],
  ): void {
    const router = this.getDevice(routerId);

    if (!router || !isRouter(router)) {
      console.warn(`Device with ID ${routerId} is not a router.`);
      return;
    }

    router.routingTable = newRoutingTable.map((entry) => ({
      ip: entry.ip,
      mask: entry.mask,
      iface: entry.iface,
      manuallyEdited: entry.manuallyEdited || false, // Ensure flag consistency
    }));

    console.log(
      `Routing table set for router ID ${routerId}:`,
      router.routingTable,
    );

    // Notify changes to persist them
    this.notifyChanges();
  }

  removeRoutingTableRow(deviceId: DeviceId, visibleRowIndex: number): void {
    const router = this.getDevice(deviceId);
    if (!router || !isRouter(router)) {
      console.warn(`Device with ID ${deviceId} is not a router.`);
      return;
    }

    // Obtener solo las entradas visibles (no eliminadas)
    const visibleEntries = router.routingTable.filter(
      (entry) => !entry.deleted,
    );

    // Validar que el índice visible es correcto
    if (visibleRowIndex < 0 || visibleRowIndex >= visibleEntries.length) {
      console.warn(`Invalid row index: ${visibleRowIndex}`);
      return;
    }

    // Buscar la entrada real en router.routingTable
    const realEntry = visibleEntries[visibleRowIndex];

    // Encontrar su índice en la tabla original
    const realIndex = router.routingTable.findIndex(
      (entry) => entry === realEntry,
    );
    if (realIndex === -1) {
      console.warn(`Could not find matching entry in original routingTable`);
      return;
    }

    // Marcar la entrada como eliminada en lugar de borrarla
    router.routingTable[realIndex].deleted = true;

    console.log(
      `Marked routing table entry as deleted:`,
      router.routingTable[realIndex],
    );

    // Notificar los cambios
    this.notifyChanges();
  }

  getRoutingTable(id: DeviceId) {
    const device = this.getDevice(id);
    if (!device || !isRouter(device)) {
      return [];
    }

    // Remove any deleted entries
    return device.routingTable.filter((entry) => !entry.deleted);
  }
}
