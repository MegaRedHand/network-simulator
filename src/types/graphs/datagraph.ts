import { DeviceType } from "../devices/device";

export type DeviceId = number;

interface CommonGraphNode {
  x: number;
  y: number;
  type: DeviceType;
  ip: string;
  mask: string;
  connections: Set<DeviceId>;
}

interface RouterGraphNode extends CommonGraphNode {
  type: DeviceType.Router;
  routingTable: RoutingTableEntry[];
}

export interface RoutingTableEntry {
  ip: string;
  mask: string;
  iface: DeviceId;
}

interface HostGraphNode extends CommonGraphNode {
  type: DeviceType.Router;
  runningPrograms: RunningProgram[];
}

export interface RunningProgram {
  name: string;
  inputs: string[];
}

// Typescript type guard
export function isRouter(node: GraphNode): node is RouterGraphNode {
  return node.type === DeviceType.Router;
}

export function isHost(node: GraphNode): node is HostGraphNode {
  return node.type === DeviceType.Host;
}

export type GraphNode = CommonGraphNode | RouterGraphNode | HostGraphNode;

export type GraphDataNode = CommonDataNode | RouterDataNode | HostDataNode;

interface CommonDataNode {
  id: DeviceId;
  x: number;
  y: number;
  type: DeviceType;
  ip: string;
  mask: string;
  connections: DeviceId[];
}

interface RouterDataNode extends CommonDataNode {
  type: DeviceType.Router;
  routingTable: RoutingTableEntry[];
}

interface HostDataNode extends CommonDataNode {
  type: DeviceType.Host;
  runningPrograms: RunningProgram[];
}

export type GraphData = GraphDataNode[];

export interface NewDevice {
  x: number;
  y: number;
  type: DeviceType;
  ip: string;
  mask: string;
}

export class DataGraph {
  private devices = new Map<DeviceId, GraphNode>();
  private idCounter: DeviceId = 1;
  private onChanges: (() => void)[] = [];

  static fromData(data: GraphData): DataGraph {
    const dataGraph = new DataGraph();
    data.forEach((nodeData: GraphDataNode) => {
      // ADD DATAGRAPH AND EDGES
      console.log(nodeData);
      const connections = new Set(nodeData.connections);
      const graphNode: GraphNode = {
        ...nodeData,
        connections: connections,
      };
      dataGraph.addDevice(nodeData.id, graphNode);
    });
    return dataGraph;
  }

  toData(): GraphData {
    const graphData: GraphData = [];

    // Serialize nodes
    this.getDevices().forEach((info, id) => {
      const graphNode: GraphDataNode = {
        id,
        x: info.x,
        y: info.y,
        type: info.type, // Save the device type (Router, Host)
        ip: info.ip,
        mask: info.mask,
        connections: Array.from(info.connections.values()),
      };
      if (isRouter(info)) {
        graphData.push({ ...graphNode, routingTable: info.routingTable });
      } else if (isHost(info)) {
        graphData.push({ ...graphNode, runningPrograms: info.runningPrograms });
      }
    });
    return graphData;
  }

  // Add a new device to the graph
  addNewDevice(deviceInfo: NewDevice): DeviceId {
    const id = this.idCounter++;
    const graphnode: GraphNode = {
      ...deviceInfo,
      connections: new Set<number>(),
      routingTable: [],
    };
    this.devices.set(id, graphnode);
    console.log(`Device added with ID ${id}`);
    this.notifyChanges();
    return id;
  }

  // Add a device to the graph
  addDevice(idDevice: DeviceId, deviceInfo: GraphNode) {
    if (this.devices.has(idDevice)) {
      console.warn(`Device with ID ${idDevice} already exists in the graph.`);
      return;
    }
    this.devices.set(idDevice, deviceInfo);
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
    const device1 = this.devices.get(n1Id);
    const device2 = this.devices.get(n2Id);
    if (!device1) {
      console.warn(`Device with ID ${n1Id} does not exist in devices.`);
      return;
    }
    if (!device2) {
      console.warn(`Device with ID ${n2Id} does not exist in devices.`);
      return;
      // Check if an edge already exists between these two devices
    }
    if (device1.connections.has(n2Id)) {
      console.warn(
        `Connection between ID ${n1Id} and ID ${n2Id} already exists.`,
      );
      return;
    }
    device1.connections.add(n2Id);
    device2.connections.add(n1Id);

    console.log(
      `Connection created between devices ID: ${n1Id} and ID: ${n2Id}`,
    );
    this.notifyChanges();
    this.regenerateAllRoutingTables();
  }

  updateDevicePosition(id: DeviceId, newValues: { x?: number; y?: number }) {
    const deviceGraphNode = this.devices.get(id);
    if (!deviceGraphNode) {
      console.warn("Device's id is not registered");
      return;
    }
    this.devices.set(id, { ...deviceGraphNode, ...newValues });
    this.notifyChanges();
  }

  getDevice(id: DeviceId): GraphNode | undefined {
    return this.devices.get(id);
  }

  // Get all connections of a device
  getConnections(id: DeviceId): DeviceId[] {
    const deviceInfo = this.devices.get(id);
    return deviceInfo.connections
      ? Array.from(deviceInfo.connections.values())
      : [];
  }

  // Get all devices in the graph
  getDevices(): Map<DeviceId, GraphNode> {
    return this.devices;
  }

  // Get the number of devices in the graph
  getDeviceCount(): number {
    return this.devices.size;
  }

  // Method to remove a device and all its connections
  removeDevice(id: DeviceId): void {
    const device = this.devices.get(id);

    if (!device) {
      console.warn(`Device with ID ${id} does not exist in the graph.`);
      return;
    }

    // Remove the connection of the current node in connected devices
    device.connections.forEach((connectedId) => {
      // can be done directly by the device
      const connectedDevice = this.devices.get(connectedId);
      if (connectedDevice) {
        connectedDevice.connections.delete(id);
      } else {
        console.warn(`Connected device ${connectedId} does not exist`);
      }
    });

    // Remove the node from the graph
    this.devices.delete(id);
    console.log(`Device with ID ${id} and its connections were removed.`);
    this.notifyChanges();
    this.regenerateAllRoutingTables();
  }

  // Method to remove a connection (edge) between two devices by their IDs
  removeConnection(n1Id: DeviceId, n2Id: DeviceId): void {
    const device1 = this.devices.get(n1Id);
    const device2 = this.devices.get(n2Id);

    if (!device1) {
      console.warn(`Device with ID ${n1Id} does not exist in the graph.`);
      return;
    }

    if (!device2) {
      console.warn(`Device with ID ${n2Id} does not exist in the graph.`);
      return;
    }

    // Check if the connection exists
    if (!device1.connections.has(n2Id) || !device2.connections.has(n1Id)) {
      console.warn(
        `Connection between ID ${n1Id} and ID ${n2Id} does not exist.`,
      );
      return;
    }

    // Remove the connection in both devices
    device1.connections.delete(n2Id);
    device2.connections.delete(n1Id);

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
    this.devices.forEach((_, id) => this.regenerateRoutingTable(id));
  }

  regenerateRoutingTable(id: DeviceId) {
    const router = this.devices.get(id);
    if (!isRouter(router)) {
      return;
    }
    console.log(`Regenerating routing table for ID ${id}`);
    const parents = new Map<DeviceId, DeviceId>();
    parents.set(id, id);
    const queue = Array.from([id]);
    while (queue.length > 0) {
      const currentId = queue.shift();
      const current = this.devices.get(currentId);
      if (!isRouter(current)) {
        // Don't route packets on hosts
        continue;
      }
      current.connections.forEach((connectedId) => {
        if (!parents.has(connectedId)) {
          parents.set(connectedId, currentId);
          queue.push(connectedId);
        }
      });
    }

    console.log(parents);

    const table: RoutingTableEntry[] = [];
    parents.forEach((currentId, childId) => {
      const dstId = childId;
      if (dstId === id) {
        return;
      }

      while (currentId !== id) {
        const parentId = parents.get(currentId);
        childId = currentId;
        currentId = parentId;
      }
      // Here the currentId is the router, and the childId
      // is the first step towards dstId
      const dst = this.devices.get(dstId);
      const entry = { ip: dst.ip, mask: dst.mask, iface: childId };
      table.push(entry);
    });
    router.routingTable = table;
  }
}
