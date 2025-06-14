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
import { ALERT_MESSAGES } from "../../utils/constants/alert_constants";
import { showWarning } from "../../graphics/renderables/alert_manager";
import { regenerateAllRoutingTables } from "../network-modules/tables/routing_table";

export type DeviceId = VertexId;

export function getNumberOfInterfaces(type: DeviceType): number {
  return NumberOfInterfacesPerType[type];
}

const NumberOfInterfacesPerType = {
  [DeviceType.Host]: 1,
  [DeviceType.Router]: 4,
  [DeviceType.Switch]: 8,
};

interface CommonDataNode {
  id?: DeviceId;
  x: number;
  y: number;
  type: DeviceType;
  interfaces: NetworkInterfaceData[];
  tag?: string;
}

export interface NetworkInterfaceData {
  name: string;
  mac: string;
  /**
   * IP address of the interface.
   * On switches this field is undefined.
   */
  ip?: string;
}

export interface SwitchDataNode extends CommonDataNode {
  forwardingTable: [string, number, boolean, boolean][]; // [mac, port, edited, deleted]
  type: DeviceType.Switch;
}

export interface NetworkDataNode extends CommonDataNode {
  mask: string;
  arpTable: [string, string, boolean][];
}

export interface RouterDataNode extends NetworkDataNode {
  type: DeviceType.Router;
  routingTable: [string, string, number, boolean, boolean][]; // [ip, mask, iface, edited, deleted]
  packetQueueSize: number;
  bytesPerSecond: number;
}

export interface RoutingTableEntry {
  ip: string;
  mask: string;
  iface: number;
  edited?: boolean;
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

export interface EdgeTip {
  id: DeviceId;
  iface: number;
}

export interface DataEdge {
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
    for (const [, device] of this.deviceGraph.getAllVertices()) {
      // parse to serializable format
      const dataNode: DataNode = device.getDataNode();
      nodes.push(dataNode);
    }
    for (const [, , edge] of this.deviceGraph.getAllEdges()) {
      edges.push(edge);
    }
    return { nodes, edges };
  }

  reAddDevice(removedData: RemovedNodeData): DeviceId {
    const { id, vertex, edges } = removedData;
    this.deviceGraph.setVertex(id, vertex);
    edges.forEach((edge) => {
      this.reAddEdge(edge);
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

  reAddEdge(
    edgeData: DataEdge,
    forcedIps: Set<string> = new Set<string>(),
  ): DataEdge | null {
    const { from, to } = edgeData;
    const n1Id = from.id;
    const n2Id = to.id;

    if (n1Id === n2Id) {
      console.warn(
        `Cannot create a connection between the same device (ID ${n1Id}).`,
      );
      return null;
    }

    const device1 = this.getDevice(n1Id);
    const device2 = this.getDevice(n2Id);

    if (!device1 || !device2) {
      console.warn(`One or both devices do not exist: ${n1Id}, ${n2Id}`);
      return null;
    }

    // Check if the interfaces are already in use
    const isIface1InUse =
      this.getConnectionsInInterface(n1Id, from.iface)?.length > 0;
    const isIface2InUse =
      this.getConnectionsInInterface(n2Id, to.iface)?.length > 0;

    // If interface 1 is in use, find the next free interface
    if (isIface1InUse) {
      const nextFreeIface1 = this.getNextFreeInterfaceNumber(device1);
      if (nextFreeIface1 !== null) {
        edgeData.from.iface = nextFreeIface1;
      } else {
        console.error(`No free interfaces available for device ${n1Id}.`);
        return null;
      }
    }

    // If interface 2 is in use, find the next free interface
    if (isIface2InUse) {
      const nextFreeIface2 = this.getNextFreeInterfaceNumber(device2);
      if (nextFreeIface2 !== null) {
        edgeData.to.iface = nextFreeIface2;
      } else {
        console.error(`No free interfaces available for device ${n2Id}.`);
        return null;
      }
    }

    // Add the edge to the graph
    if (this.deviceGraph.hasEdge(n1Id, n2Id)) {
      console.warn(
        `Connection between ID ${n1Id} and ID ${n2Id} already exists.`,
      );
      return null;
    }

    this.deviceGraph.setEdge(n1Id, n2Id, edgeData);

    this.notifyChanges();
    regenerateAllRoutingTables(this, forcedIps);
    return edgeData;
  }

  // Add a connection between two devices
  addNewEdge(n1Id: DeviceId, n2Id: DeviceId): DataEdge | null {
    const device1 = this.getDevice(n1Id);
    const device2 = this.getDevice(n2Id);
    if (!device1 || !device2) {
      console.warn(
        `Cannot create a connection between devices ${n1Id} and ${n2Id}.`,
      );
      return null;
    }
    const n1Iface = this.getNextFreeInterfaceNumber(device1);
    const n2Iface = this.getNextFreeInterfaceNumber(device2);

    if (n1Iface === null || n2Iface === null) {
      const unavailableDevices =
        n1Iface === null && n2Iface === null
          ? `devices ${n1Id} and ${n2Id}`
          : `device ${n1Iface === null ? n1Id : n2Id}`;
      showWarning(ALERT_MESSAGES.NO_FREE_INTERFACES(unavailableDevices));
      return null;
    }
    const edge: DataEdge = {
      from: { id: n1Id, iface: n1Iface },
      to: { id: n2Id, iface: n2Iface },
    };

    const forcedIps = new Set<string>();

    const iface1 = device1.interfaces?.[n1Iface];
    if (iface1?.ip) {
      forcedIps.add(iface1.ip.toString());
    }

    const iface2 = device2.interfaces?.[n2Iface];
    if (iface2?.ip) {
      forcedIps.add(iface2.ip.toString());
    }

    return this.reAddEdge(edge, forcedIps);
  }

  // NOTE: May be used in future
  private getNextInterfaceNumber(device: DataDevice): number {
    const numberOfInterfaces = getNumberOfInterfaces(device.getType());
    const ifaceUses = new Array(numberOfInterfaces)
      .fill(0)
      .map((_, i) => [i, this.getConnectionsInInterface(device.id, i).length])
      .sort(([, a], [, b]) => a - b);
    // Return the interface with the least connections
    return ifaceUses[0][0];
  }

  private getNextFreeInterfaceNumber(device: DataDevice): number | null {
    const numberOfInterfaces = getNumberOfInterfaces(device.getType());
    for (let i = 0; i < numberOfInterfaces; i++) {
      const connections = this.getConnectionsInInterface(device.id, i);
      if (!connections || connections.length === 0) {
        return i; // Return the first free interface
      }
    }
    return null; // Return null if no free interface is found
  }

  getFreeInterfaces(deviceId: DeviceId): number[] {
    const device = this.getDevice(deviceId);
    if (!device) {
      console.warn(`Device with ID ${deviceId} not found.`);
      return [];
    }
    const numberOfInterfaces = getNumberOfInterfaces(device.getType());
    const freeInterfaces: number[] = [];
    for (let i = 0; i < numberOfInterfaces; i++) {
      const connections = this.getConnectionsInInterface(deviceId, i);
      if (!connections || connections.length === 0) {
        freeInterfaces.push(i); // Add the free interface to the list
      }
    }
    return freeInterfaces; // Return the list of free interfaces
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
      if (device instanceof DataNetworkDevice && device.ownIp(sourceAddress)) {
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
    regenerateAllRoutingTables(this);
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
        this.getConnections(device.id).forEach((adjId) => {
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
    regenerateAllRoutingTables(this);
    this.notifyChanges();
  }

  subscribeChanges(callback: () => void) {
    this.onChanges.push(callback);
  }

  notifyChanges() {
    this.onChanges.forEach((callback) => callback());
  }
}
