import { RunningProgram } from "../../programs";
import { DeviceType, Layer, layerFromType } from "../devices/device";
import { layerIncluded } from "../devices/layer";
import { Graph, VertexId } from "./graph";
import { RoutingTableManager } from "./utils.ts/routingTableManager";

export type DeviceId = VertexId;

interface CommonGraphNode {
  x: number;
  y: number;
  type: DeviceType;
}

interface LinkGraphNode extends CommonGraphNode {
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
  | CommonGraphNode
  | RouterGraphNode
  | HostGraphNode
  | SwitchGraphNode;

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
  connections: DeviceId[];
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

export type GraphData = GraphDataNode[];

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
  private deviceGraph = new Graph<GraphNode, unknown>();
  private idCounter: DeviceId = 1;
  private onChanges: (() => void)[] = [];
  private routingTableManager: RoutingTableManager;

  constructor() {
    this.routingTableManager = new RoutingTableManager(this);
  }

  static fromData(data: GraphData): DataGraph {
    const dataGraph = new DataGraph();
    data.forEach((nodeData: GraphDataNode) => {
      console.log(nodeData);

      let graphNode: GraphNode = nodeData;

      if (nodeData.type === DeviceType.Router) {
        // If the node is a router, include the routing table
        const routerNode = nodeData as RouterDataNode;
        graphNode = {
          ...routerNode,
          routingTable: routerNode.routingTable || [], // Ensure routingTable exists
        };
      }

      dataGraph.addDevice(nodeData.id, graphNode, nodeData.connections);
    });

    return dataGraph;
  }

  toData(): GraphData {
    const graphData: GraphData = [];

    // Serialize nodes
    for (const [id, info] of this.deviceGraph.getAllVertices()) {
      const graphNode: GraphDataNode = {
        ...info,
        id,
        connections: Array.from(this.deviceGraph.getNeighbors(id)),
      };
      graphData.push(graphNode);
    }
    return graphData;
  }

  // Add a new device to the graph
  addNewDevice(deviceInfo: NewDevice): DeviceId {
    const id = this.idCounter++;
    const graphnode: GraphNode = {
      ...deviceInfo,
      routingTable: [],
      runningPrograms: [],
      arpTable: new Map(),
    };
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
      this.deviceGraph.setEdge(idDevice, connectedId);
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
    this.deviceGraph.setEdge(n1Id, n2Id);

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

  //=========== RoutingTable Logic ===========//

  regenerateAllRoutingTables() {
    this.routingTableManager.regenerateAllRoutingTables();
  }

  regenerateRoutingTableClean(id: DeviceId): RoutingTableEntry[] {
    return this.routingTableManager.regenerateRoutingTableClean(id);
  }

  regenerateRoutingTable(id: DeviceId) {
    this.routingTableManager.regenerateRoutingTable(id);
  }

  saveManualChange(
    routerId: DeviceId,
    visibleRowIndex: number,
    colIndex: number,
    newValue: string,
  ) {
    this.routingTableManager.saveManualChange(
      routerId,
      visibleRowIndex,
      colIndex,
      newValue,
    );
  }

  setRoutingTable(routerId: DeviceId, newRoutingTable: RoutingTableEntry[]) {
    this.routingTableManager.setRoutingTable(routerId, newRoutingTable);
  }

  removeRoutingTableRow(deviceId: DeviceId, visibleRowIndex: number) {
    this.routingTableManager.removeRoutingTableRow(deviceId, visibleRowIndex);
  }

  getRoutingTable(id: DeviceId) {
    return this.routingTableManager.getRoutingTable(id);
  }
}
