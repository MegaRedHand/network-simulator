import { RunningProgram } from "../../programs";
import { DeviceType, Layer, layerFromType } from "../devices/device";
import { layerIncluded } from "../devices/layer";

export type DeviceId = number;

interface CommonGraphNode {
  x: number;
  y: number;
  type: DeviceType;
  connections: Set<DeviceId>;
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
  private devices = new Map<DeviceId, GraphNode>();
  private idCounter: DeviceId = 1;
  private onChanges: (() => void)[] = [];

  static fromData(data: GraphData): DataGraph {
    const dataGraph = new DataGraph();
    data.forEach((nodeData: GraphDataNode) => {
      console.log(nodeData);
      const connections = new Set(nodeData.connections);

      let graphNode: GraphNode;

      if (nodeData.type === DeviceType.Router) {
        // If the node is a router, include the routing table
        const routerNode = nodeData as RouterDataNode;
        graphNode = {
          ...routerNode,
          connections: connections,
          routingTable: routerNode.routingTable || [], // Ensure routingTable exists
        };
      } else {
        graphNode = {
          ...nodeData,
          connections: connections,
        };
      }

      dataGraph.addDevice(nodeData.id, graphNode);
    });

    return dataGraph;
  }

  toData(): GraphData {
    const graphData: GraphData = [];

    // Serialize nodes
    this.getDevices().forEach((info, id) => {
      const graphNode: GraphDataNode = {
        ...info,
        id,
        connections: Array.from(info.connections.values()),
      };
      graphData.push(graphNode);
    });
    return graphData;
  }

  // Add a new device to the graph
  addNewDevice(deviceInfo: NewDevice): DeviceId {
    const id = this.idCounter++;
    // const graphNode: GraphNode = DataGraph.createGraphNode(deviceInfo);
    const graphnode: GraphNode = {
      ...deviceInfo,
      connections: new Set<number>(),
      routingTable: [],
      runningPrograms: [],
      arpTable: new Map(),
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
    deviceInfo.connections.forEach((connectedId) => {
      this.devices.get(connectedId)?.connections.add(idDevice);
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

  // Get a device by its ID.
  // WARNING: don't modify the device directly, use `modifyDevice` instead
  getDevice(id: DeviceId): GraphNode | undefined {
    return this.devices.get(id);
  }

  // Modify a device in the graph, notifying subscribers of any changes
  modifyDevice(id: DeviceId, fn: (d: GraphNode | undefined) => void) {
    const device = this.devices.get(id);
    fn(device);
    if (device) {
      this.notifyChanges();
    }
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

  public regenerateRoutingTableClean(id: DeviceId): RoutingTableEntry[] {
    return this.generateRoutingTable(id);
  }

  public regenerateRoutingTable(id: DeviceId) {
    const router = this.devices.get(id);
    if (!isRouter(router)) return;

    router.routingTable = this.generateRoutingTable(id, true);
    // console.log(
    //   `Routing table regenerated for router ID ${id}:`,
    //   router.routingTable,
    // );
  }

  private generateRoutingTable(
    id: DeviceId,
    preserveEdits = false,
  ): RoutingTableEntry[] {
    const router = this.devices.get(id);
    if (!isRouter(router)) {
      return [];
    }

    // console.log(
    //   `Regenerating ${preserveEdits ? "full" : "clean"} routing table for ID ${id}`,
    // );
    const parents = new Map<DeviceId, DeviceId>();
    parents.set(id, id);
    const queue = [id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      const current = this.devices.get(currentId);
      if (isHost(current)) continue;

      current.connections.forEach((connectedId) => {
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

      const dst = this.devices.get(dstId);

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
