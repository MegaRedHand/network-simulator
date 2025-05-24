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
  // TODO: remove this
  interfaces: NetworkInterfaceData[];
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
  switchingTable: [string, number][];
  type: DeviceType.Switch;
}

export interface NetworkDataNode extends CommonDataNode {
  // TODO: remove this
  mask: string;
  arpTable: [string, string][];
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
  iface: number;
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

  reAddEdge(edgeData: DataEdge): DataEdge | null {
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
    this.regenerateAllRoutingTables();
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
    return this.reAddEdge(edge);
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
    const router = this.deviceGraph.getVertex(id);
    if (!(router instanceof DataRouter)) return [];
    router.routingTable = this.generateRoutingTable(id);
    return router.routingTable;
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
      // Get edge connecting both devices
      const edge = this.getConnection(currentId, childId);
      // Get childId interface involved in connection
      const receivingIfaceNum =
        edge.from.id === childId ? edge.from.iface : edge.to.iface;

      while (currentId !== id) {
        const parentId = parents.get(currentId);
        childId = currentId;
        currentId = parentId;
      }

      const dst = this.deviceGraph.getVertex(dstId);
      const receivingIface = dst.interfaces[receivingIfaceNum];

      if (dst instanceof DataNetworkDevice) {
        const dataEdge = this.deviceGraph.getEdge(currentId, childId);
        if (!dataEdge) {
          console.warn(
            `Edge between devices ${currentId} and ${childId} not found!`,
          );
          return;
        }
        const sendingIfaceNum =
          dataEdge.from.id === currentId
            ? dataEdge.from.iface
            : dataEdge.to.iface;
        newTable.push({
          ip: receivingIface.ip.toString(),
          mask: dst.ipMask.toString(),
          iface: sendingIfaceNum,
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

  saveRTManualChange(
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
      (entry) => entry.deleted === false || entry.deleted === undefined,
    );

    console.log(`Visible entries:`, visibleEntries);
    console.log("visibleEntries.length", visibleEntries.length);

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

    console.log(router.routingTable);

    // Obtener solo las entradas visibles (no eliminadas)
    const visibleEntries = router.routingTable.filter(
      (entry) => entry.deleted === false || entry.deleted === undefined,
    );

    console.log(`Visible entries:`, visibleEntries);
    console.log("visibleEntries.length", visibleEntries.length);

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

  getArpTable(id: DeviceId): { ip: string; mac: string }[] {
    const device = this.getDevice(id);
    if (!device || !(device instanceof DataNetworkDevice)) {
      return [];
    }

    // Create ARP table in desirable format
    const arpTable: { ip: string; mac: string }[] = [];

    for (const [currId, currDevice] of this.getDevices()) {
      if (currId === id || !(currDevice instanceof DataNetworkDevice)) {
        continue;
      }
      currDevice.interfaces.forEach((iface) => {
        // Resolve the MAC address for the current device's IP
        const mac = device.resolveAddress(iface.ip);
        if (mac) {
          arpTable.push({
            ip: iface.ip?.toString(),
            mac: mac.toString(),
          });
        }
      });
    }

    return arpTable;
  }

  removeArpTableEntry(deviceId: DeviceId, ip: string): void {
    const device = this.getDevice(deviceId);
    if (!device || !(device instanceof DataNetworkDevice)) {
      console.warn(`Device with ID ${deviceId} is not a network device.`);
      return;
    }

    console.log(
      `Attempting to remove ARP table entry for IP ${ip} on device ID ${deviceId}`,
    );
    console.log(`Current ARP table:`, device.arpTable);

    // Validar si la IP existe en la tabla ARP
    if (!device.arpTable.has(ip)) {
      console.warn(
        `IP ${ip} not found in ARP table. Creating a new entry with an empty MAC.`,
      );
      device.arpTable.set(ip, ""); // Crear una nueva entrada con MAC vacía
      console.log(`Created new ARP table entry: IP=${ip}, MAC=""`);
    } else {
      // Actualizar la dirección MAC a un string vacío
      const mac = device.arpTable.get(ip);
      console.log(`Clearing MAC address for IP: ${ip}, current MAC: ${mac}`);
      device.arpTable.set(ip, ""); // Actualizar la entrada existente
      console.log(`Updated ARP table entry: IP=${ip}, MAC=""`);
    }

    // Notificar los cambios
    console.log(`Notifying changes after ARP table update.`);
    this.notifyChanges();
  }

  clearArpTable(deviceId: DeviceId): void {
    const device = this.getDevice(deviceId);
    if (!device || !(device instanceof DataNetworkDevice)) {
      console.warn(`Device with ID ${deviceId} is not a network device.`);
      return;
    }

    console.log(`Clearing ARP table for device ID ${deviceId}`);

    // Establecer un Map vacío para limpiar la tabla ARP
    device.arpTable = new Map<string, string>();

    console.log(`ARP table cleared for device ID ${deviceId}`);

    // Notificar los cambios
    this.notifyChanges();
  }

  saveARPTManualChange(deviceId: DeviceId, ip: string, mac: string): void {
    const device = this.getDevice(deviceId);
    if (!device || !(device instanceof DataNetworkDevice)) {
      console.warn(`Device with ID ${deviceId} is not a network device.`);
      return;
    }

    console.log(
      `Updating ARP table entry for IP ${ip} with MAC ${mac} on device ID ${deviceId}`,
    );

    // Validar si la IP es válida
    if (!ip || !mac) {
      console.warn("Invalid IP or MAC address provided.");
      return;
    }

    // Actualizar o agregar la entrada en la tabla ARP
    device.arpTable.set(ip, mac);
    console.log(`Updated ARP table entry: IP=${ip}, MAC=${mac}`);

    // Notificar los cambios
    this.notifyChanges();
  }

  /**
   * Retrieves the switching table of a switch.
   * @param deviceId - ID of the device (switch).
   * @returns An array of objects with the entries of the switching table.
   */
  getSwitchingTable(deviceId: DeviceId): { mac: string; port: number }[] {
    const device = this.getDevice(deviceId);
    if (!device || !(device instanceof DataSwitch)) {
      console.warn(`Device with ID ${deviceId} is not a switch.`);
      return [];
    }

    // Convert the Map to an array and map it to a readable format
    return Array.from(device.switchingTable.entries()).map(([mac, port]) => ({
      mac,
      port,
    }));
  }

  /**
   * Clears the switching table of a switch.
   * @param deviceId - ID of the device (switch).
   */
  clearSwitchingTable(deviceId: DeviceId): void {
    const device = this.getDevice(deviceId);
    if (!device || !(device instanceof DataSwitch)) {
      console.warn(`Device with ID ${deviceId} is not a switch.`);
      return;
    }

    // Clear the switching table
    device.switchingTable.clear();
    console.log(`Switching table cleared for device ID ${deviceId}.`);

    // Notify changes
    this.notifyChanges();
  }

  /**
   * Removes a specific entry from the switching table.
   * @param deviceId - ID of the device (switch).
   * @param mac - MAC address of the entry to remove.
   */
  removeSwitchingTableEntry(deviceId: DeviceId, mac: string): void {
    const device = this.getDevice(deviceId);
    if (!device || !(device instanceof DataSwitch)) {
      console.warn(`Device with ID ${deviceId} is not a switch.`);
      return;
    }

    // Remove the entry from the Map
    if (device.switchingTable.has(mac)) {
      device.switchingTable.delete(mac);
      console.log(
        `Entry with MAC ${mac} removed from switching table of device ID ${deviceId}.`,
      );
      this.notifyChanges();
    } else {
      console.warn(
        `Entry with MAC ${mac} not found in switching table of device ID ${deviceId}.`,
      );
    }
  }

  /**
   * Manually updates an entry in the switching table.
   * @param deviceId - ID of the device (switch).
   * @param mac - MAC address of the entry to update.
   * @param port - New port associated with the MAC address.
   */
  saveSwitchingTableManualChange(
    deviceId: DeviceId,
    mac: string,
    port: number,
  ): void {
    const device = this.getDevice(deviceId);
    if (!device || !(device instanceof DataSwitch)) {
      console.warn(`Device with ID ${deviceId} is not a switch.`);
      return;
    }

    // Update or add the entry in the Map
    device.switchingTable.set(mac, port);
    console.log(
      `Updated/added entry in switching table for device ID ${deviceId}: MAC=${mac}, Port=${port}.`,
    );

    // Notify changes
    this.notifyChanges();
  }
}
