import {
  DataGraph,
  DeviceId,
  isHost,
  isNetworkNode,
  isRouter,
  RoutingTableEntry,
} from "../datagraph";

export class RoutingTableManager {
  private routerTables: Map<DeviceId, RoutingTableEntry[]> = new Map<
    DeviceId,
    RoutingTableEntry[]
  >();
  private dataGraph: DataGraph;

  constructor(dataGraph: DataGraph) {
    this.dataGraph = dataGraph;
  }

  regenerateAllRoutingTables() {
    console.log("Regenerating all routing tables");
    for (const [id] of this.dataGraph.getDevices()) {
      this.regenerateRoutingTable(id);
    }
  }

  regenerateRoutingTable(id: DeviceId) {
    const router = this.dataGraph.getDevice(id);
    if (!isRouter(router)) return;

    const newTable = this.generateRoutingTable(id, true);
    this.routerTables.set(id, newTable);
    router.routingTable = newTable; // Mantiene sincronización con DataGraph
  }

  regenerateRoutingTableClean(id: DeviceId): RoutingTableEntry[] {
    const router = this.dataGraph.getDevice(id);
    if (!isRouter(router)) return;
    const newTable = this.generateRoutingTable(id);
    this.routerTables.set(id, newTable);
    router.routingTable = newTable; // Mantiene sincronización con DataGraph
    return newTable;
  }

  private generateRoutingTable(
    id: DeviceId,
    preserveEdits = false,
  ): RoutingTableEntry[] {
    const router = this.dataGraph.getDevice(id);
    if (!isRouter(router)) {
      return [];
    }

    const parents = new Map<DeviceId, DeviceId>();
    parents.set(id, id);
    const queue = [id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      const current = this.dataGraph.getDevice(currentId);
      if (isHost(current)) continue;

      const neighbors = this.dataGraph.getConnections(currentId) || [];
      neighbors.forEach((connectedId: DeviceId) => {
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

      const dst = this.dataGraph.getDevice(dstId);

      if (isNetworkNode(dst)) {
        newTable.push({
          ip: dst.ip,
          mask: dst.mask,
          iface: childId,
        });
      }
    });

    if (preserveEdits) {
      const existingTable = this.routerTables.get(id) || [];
      existingTable.forEach((manualEntry) => {
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

      existingTable.forEach((deletedEntry) => {
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
    visibleRowIndex: number,
    colIndex: number,
    newValue: string,
  ) {
    const router = this.dataGraph.getDevice(routerId);
    if (!router || !isRouter(router)) {
      console.warn(`Device with ID ${routerId} is not a router.`);
      return;
    }

    const visibleEntries = router.routingTable.filter(
      (entry) => !entry.deleted,
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
    console.log(
      `Updated router ID ${routerId} routing table entry at [${realIndex}, ${colIndex}] manually`,
    );

    this.dataGraph.notifyChanges();
  }

  setRoutingTable(routerId: DeviceId, newRoutingTable: RoutingTableEntry[]) {
    const router = this.dataGraph.getDevice(routerId);
    if (!router || !isRouter(router)) {
      console.warn(`Device with ID ${routerId} is not a router.`);
      return;
    }

    router.routingTable = newRoutingTable.map((entry) => ({
      ip: entry.ip,
      mask: entry.mask,
      iface: entry.iface,
      manuallyEdited: entry.manuallyEdited || false,
    }));

    this.routerTables.set(routerId, router.routingTable);

    console.log(
      `Routing table set for router ID ${routerId}:`,
      router.routingTable,
    );

    this.dataGraph.notifyChanges();
  }

  removeRoutingTableRow(deviceId: DeviceId, visibleRowIndex: number) {
    const router = this.dataGraph.getDevice(deviceId);
    if (!router || !isRouter(router)) {
      console.warn(`Device with ID ${deviceId} is not a router.`);
      return;
    }

    const visibleEntries = router.routingTable.filter(
      (entry) => !entry.deleted,
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

    console.log(`Marked routing table entry as deleted:`, realEntry);

    this.dataGraph.notifyChanges();
  }

  getRoutingTable(id: DeviceId): RoutingTableEntry[] {
    const device = this.dataGraph.getDevice(id);
    if (!device || !isRouter(device)) {
      return [];
    }
    return device.routingTable.filter((entry) => !entry.deleted);
  }
}
