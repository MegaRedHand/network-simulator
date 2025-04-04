import { IpAddress } from "../../packets/ip";
import { RunningProgram } from "../../programs";
import { DeviceType, layerFromType } from "../view-devices/vDevice";
import { layerIncluded, Layer } from "../layer";
import { Graph, RemovedVertexData, VertexId } from "./graph";
import {
  DataDevice,
  DataSwitch,
  DataNetworkDevice,
  DataHost,
  DataRouter,
} from "../data-devices";
import { GlobalContext } from "../../context";

export type DeviceId = VertexId;

interface CommonDataNode {
  id?: DeviceId;
  x: number;
  y: number;
  type: DeviceType;
  mac: string;
  arpTable?: Map<string, string>;
}

export interface SwitchDataNode extends CommonDataNode {
  type: DeviceType.Switch;
}

export interface NetworkDataNode extends CommonDataNode {
  ip: string;
  mask: string;
}

export interface RouterDataNode extends NetworkDataNode {
  type: DeviceType.Router;
  routingTable?: RoutingTableEntry[];
  packetQueueSize: number;
  timePerByte: number;
}

export interface RoutingTableEntry {
  ip: string;
  mask: string;
  iface: DeviceId;
  manuallyEdited?: boolean;
  deleted?: boolean;
}

export interface HostDataNode extends NetworkDataNode {
  type: DeviceType.Host;
  runningPrograms?: RunningProgram[];
}

// Typescript type guard
export function isSwitch(node: DataNode): node is SwitchDataNode {
  return node.type === DeviceType.Switch;
}

export function isNetworkNode(node: DataNode): node is NetworkDataNode {
  return layerIncluded(layerFromType(node.type), Layer.Network);
}

export function isRouter(node: DataNode): node is RouterDataNode {
  return node.type === DeviceType.Router;
}

export function isHost(node: DataNode): node is HostDataNode {
  return node.type === DeviceType.Host;
}

export type DataNode =
  | CommonDataNode
  | NetworkDataNode
  | RouterDataNode
  | HostDataNode
  | SwitchDataNode;

interface EdgeTip {
  id: DeviceId;
  iface: number;
}

interface DataEdge {
  from: EdgeTip;
  to: EdgeTip;
}

export interface GraphData {
  nodes: DataNode[];
  edges: DataEdge[];
}

export type RemovedNodeData = RemovedVertexData<DataDevice, DataEdge>;

export class DataGraph {
  ctx: GlobalContext;
  // NOTE: we don't store data in edges yet
  deviceGraph = new Graph<DataDevice, DataEdge>();
  private onChanges: (() => void)[] = [];

  constructor(ctx: GlobalContext) {
    DataDevice.initializedIdCounter();
    this.ctx = ctx;
  }

  static fromData(data: GraphData, ctx: GlobalContext): DataGraph {
    const dataGraph = new DataGraph(ctx);

    data.nodes.forEach((nodeData: DataNode) => {
      console.log(nodeData);
      dataGraph.addDevice(nodeData);
    });

    data.edges.forEach((edgeData: DataEdge) => {
      dataGraph.deviceGraph.setEdge(edgeData.from.id, edgeData.to.id, edgeData);
    });

    return dataGraph;
  }

  toData(): GraphData {
    const nodes: DataNode[] = [];
    const edges: DataEdge[] = [];

    // Serialize nodes
    for (const [id, device] of this.deviceGraph.getAllVertices()) {
      // parse to serializable format
      let dataNode: DataNode = {
        id,
        x: device.x,
        y: device.y,
        mac: device.mac.toString(),
        type: device.getType(),
        arpTable: new Map<string, string>(), // TODO: change this to the actual ARP table
      };

      if (device instanceof DataNetworkDevice) {
        dataNode = {
          ...dataNode,
          ip: device.ip.toString(),
          mask: device.ipMask.toString(),
        };
      }

      if (device instanceof DataRouter) {
        // ip and mask already set with DataNetworkDevice
        dataNode = {
          ...dataNode,
          routingTable: device.routingTable,
          packetQueueSize: device.packetQueueSize,
          timePerByte: device.timePerByte,
        };
      } else if (device instanceof DataHost) {
        dataNode = {
          ...dataNode,
          runningPrograms: device.runningPrograms,
        };
      }
      nodes.push(dataNode);
    }
    for (const [, , edge] of this.deviceGraph.getAllEdges()) {
      edges.push(edge);
    }
    return { nodes, edges };
  }

  readdDevice(removedData: RemovedNodeData): DeviceId {
    const { id, vertex, edges } = removedData;
    this.deviceGraph.setVertex(id, vertex);
    edges.forEach((edge) => {
      this.deviceGraph.setEdge(edge.from.id, edge.to.id, edge);
    });
    this.notifyChanges();
    return id;
  }

  // Add a device to the graph
  addDevice(dataNode: DataNode) {
    const device: DataDevice = isSwitch(dataNode)
      ? new DataSwitch(dataNode, this)
      : isRouter(dataNode)
        ? new DataRouter(dataNode, this)
        : isHost(dataNode)
          ? new DataHost(dataNode, this)
          : undefined;
    if (!device) {
      console.warn(`Device type unknown: ${dataNode.type}`);
      return;
    }
    const deviceId = device.id;
    if (this.deviceGraph.hasVertex(deviceId)) {
      console.warn(`Device with ID ${deviceId} already exists in the graph.`);
      return;
    }
    this.deviceGraph.setVertex(deviceId, device);
    console.log(`Device added with ID ${deviceId}`);
    this.notifyChanges();
    return deviceId;
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
    const edge = {
      from: { id: n1Id, iface: n2Id },
      to: { id: n2Id, iface: n1Id },
    };
    this.deviceGraph.setEdge(n1Id, n2Id, edge);

    console.log(
      `Connection created between devices ID: ${n1Id} and ID: ${n2Id}`,
    );
    this.notifyChanges();
    this.regenerateAllRoutingTables();
  }

  updateDevicePosition(id: DeviceId, newValues: { x?: number; y?: number }) {
    const deviceDataNode = this.deviceGraph.getVertex(id);
    if (!deviceDataNode) {
      console.warn("Device's id is not registered");
      return;
    }
    deviceDataNode.x = newValues.x ?? deviceDataNode.x;
    deviceDataNode.y = newValues.y ?? deviceDataNode.y;
    this.notifyChanges();
  }

  // Get a device by its ID.
  // WARNING: don't modify the device directly, use `modifyDevice` instead
  getDevice(id: DeviceId): DataDevice | undefined {
    return this.deviceGraph.getVertex(id);
  }

  // Same logic than the one in ViewGraph.
  // Get a device by its IP address
  getDeviceByIP(sourceAddress: IpAddress): DataDevice {
    for (const [, device] of this.getDevices()) {
      if (
        device instanceof DataNetworkDevice &&
        device.ip.equals(sourceAddress)
      ) {
        return device;
      }
    }
  }

  // Modify a device in the graph, notifying subscribers of any changes
  modifyDevice(id: DeviceId, fn: (d: DataDevice | undefined) => void) {
    const device = this.deviceGraph.getVertex(id);
    fn(device);
    if (device) {
      this.notifyChanges();
    }
  }

  // Get all devices in the graph
  getDevices(): IterableIterator<[DeviceId, DataDevice]> {
    return this.deviceGraph.getAllVertices();
  }

  // Get the number of devices in the graph
  getDeviceCount(): number {
    return this.deviceGraph.getVertexCount();
  }

  // Get all connections of a device
  getConnection(n1Id: DeviceId, n2Id: DeviceId): DataEdge | undefined {
    return this.deviceGraph.getEdge(n1Id, n2Id);
  }

  // Get all connections of a device
  getConnections(id: DeviceId): DeviceId[] | undefined {
    return this.deviceGraph.getNeighbors(id);
  }

  hasDevice(id: DeviceId) {
    return this.deviceGraph.hasVertex(id);
  }

  // Get all connections of a device in a given interface
  getConnectionsInInterface(
    id: DeviceId,
    iface: number,
  ): DeviceId[] | undefined {
    if (!this.deviceGraph.hasVertex(id)) {
      return;
    }
    const connections = [];
    for (const [neighborId, { from, to }] of this.deviceGraph.getEdges(id)) {
      if (
        (from.id === id && from.iface === iface) ||
        (to.id === id && to.iface === iface)
      ) {
        connections.push(neighborId);
      }
    }
    return connections;
  }

  // Method to remove a device and all its connections
  removeDevice(id: DeviceId): RemovedNodeData | undefined {
    if (!this.deviceGraph.hasVertex(id)) {
      console.warn(`Device with ID ${id} does not exist in the graph.`);
      return;
    }
    const removedData = this.deviceGraph.removeVertex(id);
    console.log(`Device with ID ${id} and its connections were removed.`);
    this.notifyChanges();
    this.regenerateAllRoutingTables();
    return removedData;
  }

  // Same logic than the one in ViewGraph.
  // Dummy shortcut to set a packet destination mac when forwading a packet
  getPathBetween(startId: number, endId: number): DeviceId[] {
    // try to avoid having a host in the middle of the path
    if (startId === endId) {
      return [];
    }
    if (
      !(
        this.deviceGraph.hasVertex(startId) && this.deviceGraph.hasVertex(endId)
      )
    ) {
      console.warn(`At least one device does not exist`);
      return [];
    }
    const startDevice = this.deviceGraph.getVertex(startId);
    const queue: [DataDevice, DeviceId[]][] = [[startDevice, [startId]]];
    const visited: Set<DeviceId> = new Set<DeviceId>();

    while (queue.length > 0) {
      const [device, path] = queue.shift();

      if (device.id === endId) {
        return path;
      }

      if (!visited.has(device.id)) {
        visited.add(device.id);
        this.deviceGraph.getNeighbors(device.id).forEach((adjId) => {
          const adjDevice = this.deviceGraph.getVertex(adjId);
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
    if (!(router instanceof DataRouter)) return;

    router.routingTable = this.generateRoutingTable(id, true);
  }

  private generateRoutingTable(
    id: DeviceId,
    preserveEdits = false,
  ): RoutingTableEntry[] {
    const router = this.deviceGraph.getVertex(id);
    if (!(router instanceof DataRouter)) {
      return [];
    }

    const parents = new Map<DeviceId, DeviceId>();
    parents.set(id, id);
    const queue = [id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      const current = this.deviceGraph.getVertex(currentId);
      if (current instanceof DataHost) continue;

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

      if (dst instanceof DataNetworkDevice) {
        newTable.push({
          ip: dst.ip.toString(),
          mask: dst.ipMask.toString(),
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
    if (!router || !(router instanceof DataRouter)) {
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

    if (!router || !(router instanceof DataRouter)) {
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
    if (!router || !(router instanceof DataRouter)) {
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
    if (!device || !(device instanceof DataRouter)) {
      return [];
    }

    // Remove any deleted entries
    return device.routingTable.filter((entry) => !entry.deleted);
  }
}
