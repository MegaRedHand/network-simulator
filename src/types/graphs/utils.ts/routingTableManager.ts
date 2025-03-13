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

  private buildRoutingTree(id: DeviceId): Map<DeviceId, DeviceId> {
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

    return parents;
  }

  private buildRoutingTableFromTree(
    id: DeviceId,
    parents: Map<DeviceId, DeviceId>,
  ): RoutingTableEntry[] {
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

    return newTable;
  }

  private preserveManualChanges(
    id: DeviceId,
    newTable: RoutingTableEntry[],
  ): RoutingTableEntry[] {
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

    // 1️. Build the routing tree using BFS (Breadth-First Search)
    // This maps each device to its parent in the shortest path
    const parents = this.buildRoutingTree(id);

    // 2️. Generate the routing table from the tree
    // Converts the parent-child relationships into routing table entries
    let newTable = this.buildRoutingTableFromTree(id, parents);

    // 3️. Optimize the routing table by aggregating prefixes
    // Reduces the number of routes by merging adjacent subnets
    newTable = this.aggregateRoutes(newTable);

    // 4️. Preserve manually edited routes if necessary
    // Ensures that user modifications are not lost
    if (preserveEdits) {
      newTable = this.preserveManualChanges(id, newTable);
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

  private aggregateRoutes(
    routingTable: RoutingTableEntry[],
  ): RoutingTableEntry[] {
    console.log("🚀 Starting route aggregation...");

    const aggregatedTable: RoutingTableEntry[] = [];
    const groupedByIface = new Map<number, RoutingTableEntry[]>();

    // 1. Group routes by interface
    routingTable.forEach((entry) => {
      if (!groupedByIface.has(entry.iface)) {
        groupedByIface.set(entry.iface, []);
      }
      const group = groupedByIface.get(entry.iface);
      if (group) {
        group.push(entry);
      }
    });

    // 2️. Attempt to aggregate routes per interface
    groupedByIface.forEach((entries, iface) => {
      const sortedEntries = entries.sort((a, b) => this.compareIPs(a.ip, b.ip));

      let blockStart = sortedEntries[0];
      let blockSize = 1;

      for (let i = 1; i < sortedEntries.length; i++) {
        const currentIP = sortedEntries[i].ip;

        const newBlockSize = blockSize * 2;
        const newMask = this.calculateSubnetMask(newBlockSize);
        const newNetworkAddress = this.getNetworkAddress(
          blockStart.ip,
          newMask,
        );
        const currentNetworkAddress = this.getNetworkAddress(
          currentIP,
          newMask,
        );

        // Check if the current IP belongs to the same aggregated network
        if (newNetworkAddress === currentNetworkAddress) {
          blockSize = newBlockSize;
        } else {
          // Store the aggregated block before starting a new one
          const mask = this.calculateSubnetMask(blockSize);
          const aggregatedIP = this.getNetworkAddress(blockStart.ip, mask);

          aggregatedTable.push({ ip: aggregatedIP, mask: mask, iface: iface });

          // Reset the block
          blockStart = sortedEntries[i];
          blockSize = 1;
        }
      }

      // Add the last detected aggregation
      const finalMask = this.calculateSubnetMask(blockSize);
      const finalAggregatedIP = this.getNetworkAddress(
        blockStart.ip,
        finalMask,
      );

      aggregatedTable.push({
        ip: finalAggregatedIP,
        mask: finalMask,
        iface: iface,
      });
    });

    return aggregatedTable;
  }

  private compareIPs(ip1: string, ip2: string): number {
    // Compare two IP addresses by their numerical value
    const parts1 = ip1.split(".").map(Number);
    const parts2 = ip2.split(".").map(Number);

    for (let i = 0; i < 4; i++) {
      if (parts1[i] !== parts2[i]) {
        return parts1[i] - parts2[i];
      }
    }
    return 0;
  }

  private calculateSubnetMask(size: number): string {
    // Compute the subnet mask based on the block size
    if (size <= 0) return "255.255.255.255"; // Prevents negative size errors

    const bits = 32 - Math.floor(Math.log2(size)); // Ensures correct block sizes
    return this.prefixToSubnet(bits);
  }

  private prefixToSubnet(prefix: number): string {
    // Convert a CIDR prefix to a subnet mask
    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    return [
      (mask >>> 24) & 255,
      (mask >>> 16) & 255,
      (mask >>> 8) & 255,
      mask & 255,
    ].join(".");
  }

  private getNetworkAddress(ip: string, mask: string): string {
    // Compute the network address given an IP and a subnet mask
    const ipParts = ip.split(".").map(Number);
    const maskParts = mask.split(".").map(Number);

    const networkParts = ipParts.map((part, i) => part & maskParts[i]);
    return networkParts.join(".");
  }
}
