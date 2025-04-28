import { DataRouter, DataNetworkDevice, DataHost } from "./data-devices";
import { DataGraph, DeviceId, RoutingTableEntry } from "./graphs/datagraph";

export class RoutingTableManager {
  private graph: DataGraph;

  constructor(graph: DataGraph) {
    this.graph = graph;
  }

  regenerateAllRoutingTables(): void {
    console.log("Regenerating all routing tables");
    for (const [id] of this.graph.getDevices()) {
      this.regenerateRoutingTable(id);
    }
  }

  regenerateRoutingTableClean(routerId: DeviceId): RoutingTableEntry[] {
    const router = this.graph.getDevice(routerId);
    if (!(router instanceof DataRouter)) return [];
    router.routingTable = this.generateRoutingTable(routerId);
    return router.routingTable;
  }

  regenerateRoutingTable(routerId: DeviceId): void {
    const router = this.graph.getDevice(routerId);
    if (!(router instanceof DataRouter)) return;

    router.routingTable = this.generateRoutingTable(routerId, true);
  }

  private generateRoutingTable(
    routerId: DeviceId,
    preserveEdits = false,
  ): RoutingTableEntry[] {
    const router = this.graph.getDevice(routerId);
    if (!(router instanceof DataRouter)) {
      return [];
    }

    const parents = new Map<DeviceId, DeviceId>();
    parents.set(routerId, routerId);
    const queue = [routerId];
    while (queue.length > 0) {
      const currentId = queue.shift();
      const current = this.graph.getDevice(currentId);
      if (current instanceof DataHost) continue;

      const neighbors = this.graph.getConnections(currentId);
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
      if (dstId === routerId) return;

      while (currentId !== routerId) {
        const parentId = parents.get(currentId);
        childId = currentId;
        currentId = parentId;
      }

      const dst = this.graph.getDevice(dstId);

      if (dst instanceof DataNetworkDevice) {
        const dataEdge = this.graph.getConnection(currentId, childId);
        if (!dataEdge) {
          console.warn(
            `Edge between devices ${currentId} and ${childId} not found!`,
          );
          return;
        }
        const iface =
          dataEdge.from.id === currentId
            ? dataEdge.from.iface
            : dataEdge.to.iface;
        newTable.push({
          ip: dst.ip.toString(),
          mask: dst.ipMask.toString(),
          iface,
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
          } else {
            newTable.push(deletedEntry);
          }
        }
      });
    }

    console.log(`Generated routing table for router ID ${routerId}:`, newTable);
    return newTable;
  }

  saveManualChange(
    routerId: DeviceId,
    visibleRowIndex: number,
    colIndex: number,
    newValue: string,
  ): void {
    const router = this.graph.getDevice(routerId);
    if (!router || !(router instanceof DataRouter)) {
      console.warn(`Device with ID ${routerId} is not a router.`);
      return;
    }

    const visibleEntries = router.routingTable.filter(
      (entry) => entry.deleted === false || entry.deleted === undefined,
    );

    if (visibleRowIndex < 0 || visibleRowIndex >= visibleEntries.length) {
      console.warn(`Invalid row index: ${visibleRowIndex}`);
      return;
    }

    const realEntry = visibleEntries[visibleRowIndex];

    const realIndex = router.routingTable.findIndex(
      (entry) => entry === realEntry,
    );
    if (realIndex === -1) {
      console.warn(`Could not find matching entry in original routingTable`);
      return;
    }

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

    router.routingTable[realIndex].manuallyEdited = true;
    this.graph.notifyChanges();
  }

  setRoutingTable(
    routerId: DeviceId,
    newRoutingTable: RoutingTableEntry[],
  ): void {
    const router = this.graph.getDevice(routerId);

    if (!router || !(router instanceof DataRouter)) {
      console.warn(`Device with ID ${routerId} is not a router.`);
      return;
    }

    router.routingTable = newRoutingTable.map((entry) => ({
      ip: entry.ip,
      mask: entry.mask,
      iface: entry.iface,
      manuallyEdited: entry.manuallyEdited || false,
    }));

    this.graph.notifyChanges();
  }

  removeRoutingTableRow(deviceId: DeviceId, visibleRowIndex: number): void {
    const router = this.graph.getDevice(deviceId);
    if (!router || !(router instanceof DataRouter)) {
      console.warn(`Device with ID ${deviceId} is not a router.`);
      return;
    }

    const visibleEntries = router.routingTable.filter(
      (entry) => entry.deleted === false || entry.deleted === undefined,
    );

    if (visibleRowIndex < 0 || visibleRowIndex >= visibleEntries.length) {
      console.warn(`Invalid row index: ${visibleRowIndex}`);
      return;
    }

    const realEntry = visibleEntries[visibleRowIndex];

    const realIndex = router.routingTable.findIndex(
      (entry) => entry === realEntry,
    );
    if (realIndex === -1) {
      console.warn(`Could not find matching entry in original routingTable`);
      return;
    }

    router.routingTable[realIndex].deleted = true;

    this.graph.notifyChanges();
  }

  getRoutingTable(id: DeviceId): RoutingTableEntry[] {
    const device = this.graph.getDevice(id);
    if (!device || !(device instanceof DataRouter)) {
      return [];
    }

    return device.routingTable.filter((entry) => !entry.deleted);
  }
}
