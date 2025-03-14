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

  // Aggregates routing table entries
  aggregateRoutes(routingTable: RoutingTableEntry[]): RoutingTableEntry[] {
    const aggregatedTable: RoutingTableEntry[] = [];

    // 1️ Group routes by interface (aggregation only happens within the same interface)
    const groupedByIface = this.groupByIface(routingTable);

    // 2️ Process each interface group
    groupedByIface.forEach((entries, iface) => {
      // 2A. Sort routes by IP for structured processing
      const sortedEntries = entries.sort((a, b) => this.compareIPs(a.ip, b.ip));

      // 2B. Group by prefix length (e.g., /24, /23, /22, etc.)
      const groupedByPrefix = this.groupByPrefix(sortedEntries);

      // 2C. sort from largest to smallest prefix (e.g., /24 → /23 → /22)
      const sortedPrefixes = Array.from(groupedByPrefix.keys()).sort(
        (a, b) => b - a,
      );

      // Start processing prefixes from the first level
      this.processPrefixes(
        sortedPrefixes,
        groupedByPrefix,
        aggregatedTable,
        iface,
      );
    });

    // Sort first by mask and then by IP
    return this.sortAggregatedTable(aggregatedTable);
  }

  // Group routes by interface
  private groupByIface(
    routingTable: RoutingTableEntry[],
  ): Map<number, RoutingTableEntry[]> {
    const groupedByIface = new Map<number, RoutingTableEntry[]>();

    routingTable.forEach((entry) => {
      if (!groupedByIface.has(entry.iface)) {
        groupedByIface.set(entry.iface, []);
      }
      groupedByIface.get(entry.iface)?.push(entry);
    });

    return groupedByIface;
  }

  // Group routes by prefix length (e.g., /24, /23, /22, etc.)
  private groupByPrefix(
    entries: RoutingTableEntry[],
  ): Map<number, RoutingTableEntry[]> {
    const groupedByPrefix = new Map<number, RoutingTableEntry[]>();

    entries.forEach((entry) => {
      const prefix = this.subnetToPrefix(entry.mask);
      if (!groupedByPrefix.has(prefix)) {
        groupedByPrefix.set(prefix, []);
      }
      groupedByPrefix.get(prefix)?.push(entry);
    });

    return groupedByPrefix;
  }

  // Sort the aggregated table first by mask and then by IP
  private sortAggregatedTable(
    aggregatedTable: RoutingTableEntry[],
  ): RoutingTableEntry[] {
    return aggregatedTable.sort((a, b) => {
      const prefixA = this.subnetToPrefix(a.mask);
      const prefixB = this.subnetToPrefix(b.mask);
      if (prefixA !== prefixB) {
        return prefixA - prefixB; // Sort by prefix in descending order
      }
      return this.compareIPs(a.ip, b.ip); // Sort by IP in ascending order
    });
  }

  // Process prefixes recursively
  private processPrefixes(
    prefixes: number[],
    groupedByPrefix: Map<number, RoutingTableEntry[]>,
    aggregatedTable: RoutingTableEntry[],
    iface: number,
  ): void {
    // Define a recursive function to process each level of prefixes
    const process = (level: number) => {
      // Base case: if level exceeds the number of prefixes, return
      if (level >= prefixes.length) return;

      const prefix = prefixes[level]; // Get the current prefix
      let groupEntries = groupedByPrefix.get(prefix) || []; // Get the entries for the current prefix group
      let merged = true; // Flag to check if any entries were merged

      // Loop to merge entries as long as there are entries to merge
      while (merged) {
        merged = false; // Reset the merge flag
        const newEntries: RoutingTableEntry[] = []; // Container for new entries after merging
        let j = 0;

        // Iterate over the group entries
        while (j < groupEntries.length) {
          // Ensure there is a next entry to compare
          if (j < groupEntries.length - 1) {
            const ip1 = groupEntries[j].ip;
            const ip2 = groupEntries[j + 1].ip;
            const mask = groupEntries[j].mask;

            // Check if the two entries can be aggregated
            if (
              this.differByOneBit(ip1, ip2, mask) &&
              mask === groupEntries[j + 1].mask
            ) {
              // Create a new aggregated entry
              const newEntry = this.createAggregatedEntry(
                ip1,
                ip2,
                mask,
                iface,
              );
              merged = true; // Set the merge flag to true

              // Get the prefix of the new aggregated entry
              const nextPrefix = this.subnetToPrefix(newEntry.mask);
              // Update the grouped entries by prefix with the new aggregated entry
              this.updateGroupedByPrefix(
                nextPrefix,
                newEntry,
                groupedByPrefix,
                prefixes,
              );

              j += 2; // Skip the next entry since it was merged
              continue;
            }
          }
          // If merging is not possible, keep the original entry
          newEntries.push(groupEntries[j]);
          j++;
        }
        // Replace group entries with the new merged ones
        groupEntries = newEntries;
      }

      // Add remaining entries to the aggregated table
      aggregatedTable.push(...groupEntries);

      // Recursively process the next level of prefixes
      process(level + 1);
    };

    // Start processing from level 0
    process(0);
  }

  // Create a new aggregated entry
  private createAggregatedEntry(
    ip1: string,
    ip2: string,
    mask: string,
    iface: number,
  ): RoutingTableEntry {
    const newMask = this.getAggregatedMask(mask);
    const newNetworkAddress = this.getNetworkAddress(ip1, newMask);
    return { ip: newNetworkAddress, mask: newMask, iface: iface };
  }

  // Update groupedByPrefix with a new entry
  private updateGroupedByPrefix(
    nextPrefix: number,
    newEntry: RoutingTableEntry,
    groupedByPrefix: Map<number, RoutingTableEntry[]>,
    prefixes: number[],
  ): void {
    if (!groupedByPrefix.has(nextPrefix)) {
      groupedByPrefix.set(nextPrefix, []);
      prefixes.push(nextPrefix);
      prefixes.sort((a, b) => b - a);
    }
    groupedByPrefix.get(nextPrefix)?.push(newEntry);
  }

  compareIPs(ip1: string, ip2: string): number {
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

  differByOneBit(ip1: string, ip2: string, mask: string): boolean {
    // Convert the IP addresses and subnet mask to numerical values
    const num1 = this.ipToNumber(ip1);
    const num2 = this.ipToNumber(ip2);
    const maskNum = this.ipToNumber(mask);

    // Calculate the length of the mask by counting the number of leading 1 bits
    const maskLength = 32 - Math.log2(~maskNum + 1);
    const shiftAmount = 32 - maskLength;

    // Extract the relevant parts of the IP addresses after applying the mask
    const relevantPart1 = (num1 & maskNum) >>> shiftAmount;
    const relevantPart2 = (num2 & maskNum) >>> shiftAmount;

    // Calculate the difference between the relevant parts
    const diff = relevantPart1 ^ relevantPart2;

    // Check if the difference is exactly one bit (i.e., the last bit)
    const lastBitMask = 1; // Mask to check the last bit (000...0001)
    const result = diff === lastBitMask;

    return result;
  }

  getAggregatedMask(mask: string): string {
    const prefix = this.subnetToPrefix(mask);
    const newPrefix = prefix - 1;

    if (newPrefix < 0) {
      console.warn(`⚠ Invalid aggregation: trying to use /${newPrefix}`);
      return mask;
    }

    return this.prefixToSubnet(newPrefix);
  }

  subnetToPrefix(subnet: string): number {
    const binary = subnet
      .split(".")
      .map((octet) => parseInt(octet, 10).toString(2).padStart(8, "0"))
      .join("");

    return binary.split("1").length - 1;
  }

  prefixToSubnet(prefix: number): string {
    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    return [
      (mask >>> 24) & 255,
      (mask >>> 16) & 255,
      (mask >>> 8) & 255,
      mask & 255,
    ].join(".");
  }

  getNetworkAddress(ip: string, mask: string): string {
    // Compute the network address given an IP and a subnet mask
    const ipParts = ip.split(".").map(Number);
    const maskParts = mask.split(".").map(Number);

    const networkParts = ipParts.map((part, i) => part & maskParts[i]);
    return networkParts.join(".");
  }

  ipToNumber(ip: string): number {
    return (
      ip
        .split(".")
        .map(Number)
        .reduce((acc, val) => (acc << 8) + val) >>> 0
    );
  }
}
