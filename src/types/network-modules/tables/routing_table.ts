import { compareIps, IpAddress } from "../../../packets/ip";
import {
  InvalidIfaceError,
  InvalidIpError,
  InvalidMaskError,
  ROUTER_TABLE_CONSTANTS,
} from "../../../utils/constants/table_constants";
import { DataRouter, DataHost, DataNetworkDevice } from "../../data-devices";
import { RoutingEntry } from "../../data-devices/dRouter";
import { DataGraph, DeviceId } from "../../graphs/datagraph";
import { Table } from "./table";

export function regenerateRoutingTableClean(
  dataGraph: DataGraph,
  id: DeviceId,
) {
  const router = dataGraph.getDevice(id);
  if (!(router instanceof DataRouter)) return;

  router.routingTable = new Table<RoutingEntry>(
    "ip",
    generateRoutingTable(dataGraph, id),
  );
  sortRoutingTable(router.routingTable);
  dataGraph.notifyChanges();
}

export function regenerateRoutingTable(
  dataGraph: DataGraph,
  id: DeviceId,
  forcedIps: Set<string> = new Set<string>(),
) {
  const router = dataGraph.getDevice(id);
  if (!(router instanceof DataRouter)) return;

  const protectedIps = new Set(
    router.routingTable.allEditedOrDeleted().map((entry) => entry.ip),
  );

  const newEntries = generateRoutingTable(dataGraph, id);
  const finalEntries: RoutingEntry[] = [];

  newEntries.forEach((entry) => {
    if (forcedIps.has(entry.ip)) {
      // If forced, always overwrite the protected entry
      finalEntries.push({ ...entry, deleted: false, edited: false });
    } else if (!protectedIps.has(entry.ip)) {
      // If not protected, add the new entry
      finalEntries.push(entry);
    }
    // If protected and not forced, DO NOT add (keep the old protected entry)
  });

  // Keep protected entries (edited or deleted) that are not in forcedIps
  router.routingTable.allEditedOrDeleted().forEach((entry) => {
    if (!forcedIps.has(entry.ip)) {
      finalEntries.push(entry);
    }
  });

  // Clear and populate the table
  router.routingTable.clear();
  finalEntries.forEach((entry) => router.routingTable.add(entry));

  sortRoutingTable(router.routingTable);
  dataGraph.notifyChanges();
}

export function regenerateAllRoutingTables(
  dataGraph: DataGraph,
  forcedIps: Set<string> = new Set<string>(),
) {
  for (const [id, device] of dataGraph.getDevices()) {
    if (device instanceof DataRouter) {
      regenerateRoutingTable(dataGraph, id, forcedIps);
    }
  }
}

export function generateRoutingTable(
  dataGraph: DataGraph,
  id: DeviceId,
): RoutingEntry[] {
  const router = dataGraph.deviceGraph.getVertex(id);
  if (!(router instanceof DataRouter)) {
    return [];
  }

  // BFS
  const parents = new Map<DeviceId, DeviceId>();
  parents.set(id, id);
  const queue = [id];
  while (queue.length > 0) {
    const currentId = queue.shift();
    const current = dataGraph.deviceGraph.getVertex(currentId);
    if (current instanceof DataHost) continue;

    const neighbors = dataGraph.deviceGraph.getNeighbors(currentId);
    neighbors.forEach((connectedId) => {
      if (!parents.has(connectedId)) {
        parents.set(connectedId, currentId);
        queue.push(connectedId);
      }
    });
  }

  const newTable: RoutingEntry[] = [];

  parents.forEach((currentId, childId) => {
    const dstId = childId;
    if (dstId === id) return;

    // Get edge connecting both devices
    const edge = dataGraph.getConnection(currentId, childId);
    if (!edge) {
      console.warn(
        `Edge between devices ${currentId} and ${childId} not found!`,
      );
      return;
    }
    // Get childId interface involved in connection
    const receivingIfaceNum =
      edge.from.id === childId ? edge.from.iface : edge.to.iface;

    // Walk up to the root to find the correct outgoing interface
    let walkerCurrent = currentId;
    let walkerChild = childId;
    while (walkerCurrent !== id) {
      const parentId = parents.get(walkerCurrent);
      walkerChild = walkerCurrent;
      walkerCurrent = parentId;
    }

    const dst = dataGraph.deviceGraph.getVertex(dstId);
    if (!(dst instanceof DataNetworkDevice)) return;
    const receivingIface = dst.interfaces[receivingIfaceNum];

    // Find the edge from router to first hop
    const dataEdge = dataGraph.deviceGraph.getEdge(walkerCurrent, walkerChild);
    if (!dataEdge) {
      console.warn(
        `Edge between devices ${walkerCurrent} and ${walkerChild} not found!`,
      );
      return;
    }
    const sendingIfaceNum =
      dataEdge.from.id === walkerCurrent
        ? dataEdge.from.iface
        : dataEdge.to.iface;

    newTable.push({
      ip: receivingIface.ip.toString(),
      mask: dst.ipMask.toString(),
      iface: sendingIfaceNum,
    });
  });

  console.log(
    `[RoutingTable] Generated routing table for router ${id}:`,
    newTable,
  );
  return newTable;
}

export function getRoutingTable(dataGraph: DataGraph, id: DeviceId) {
  const device = dataGraph.getDevice(id);
  if (!device || !(device instanceof DataRouter)) {
    return [];
  }
  return device.routingTable.allActive();
}

export function sortRoutingTable(routingTable: Table<RoutingEntry>) {
  const sorted = routingTable.all().sort((a, b) => {
    const prefixLengthA = IpAddress.getPrefixLength(IpAddress.parse(a.mask));
    const prefixLengthB = IpAddress.getPrefixLength(IpAddress.parse(b.mask));
    if (prefixLengthA !== prefixLengthB) {
      return prefixLengthB - prefixLengthA;
    }
    const ipA = IpAddress.parse(a.ip);
    const ipB = IpAddress.parse(b.ip);
    return compareIps(ipA, ipB);
  });
  routingTable.clear();
  sorted.forEach((entry) => routingTable.add(entry));
}

export function saveRoutingTableManualChange(
  dataGraph: DataGraph,
  routerId: DeviceId,
  ip: string,
  colIndex: number,
  newValue: string,
): boolean {
  const router = dataGraph.getDevice(routerId);
  if (!router || !(router instanceof DataRouter)) {
    console.warn(`Device with ID ${routerId} is not a router.`);
    return false;
  }

  const entry = router.routingTable.get(ip);
  const editedEntry = {} as RoutingEntry;
  if (!entry) {
    console.warn(`Entry with IP ${ip} not found.`);
    return false;
  }

  if (colIndex === ROUTER_TABLE_CONSTANTS.IP_COL_INDEX) {
    if (!IpAddress.isValidIP(newValue)) {
      throw new InvalidIpError();
    }
    if (entry.ip === newValue) return false;
    editedEntry.ip = newValue;
  } else if (colIndex === ROUTER_TABLE_CONSTANTS.MASK_COL_INDEX) {
    if (!IpAddress.isValidIP(newValue)) {
      throw new InvalidMaskError();
    }
    if (entry.mask === newValue) return false;
    editedEntry.mask = newValue;
  } else if (colIndex === ROUTER_TABLE_CONSTANTS.INTERFACE_COL_INDEX) {
    const ifaceValue = newValue.startsWith("eth")
      ? parseInt(newValue.replace("eth", ""), 10)
      : parseInt(newValue, 10);
    if (isNaN(ifaceValue) || ifaceValue < 0) {
      throw new InvalidIfaceError();
    }
    if (entry.iface === ifaceValue) return false;
    editedEntry.iface = ifaceValue;
  } else {
    console.warn(`Invalid column index ${colIndex} for routing table.`);
    return false;
  }

  router.routingTable.edit(ip, editedEntry);
  sortRoutingTable(router.routingTable);
  dataGraph.notifyChanges();
  return true;
}

export function removeRoutingTableRow(
  dataGraph: DataGraph,
  routerId: DeviceId,
  ip: string,
) {
  const router = dataGraph.getDevice(routerId);
  if (!router || !(router instanceof DataRouter)) {
    console.warn(`Device with ID ${routerId} is not a router.`);
    return;
  }

  const entry = router.routingTable.get(ip);
  if (!entry) {
    console.warn(`Entry with IP ${ip} not found.`);
    return;
  }

  router.routingTable.softRemove(ip);
  dataGraph.notifyChanges();
}

export function updateRoutingTableIface(
  dataGraph: DataGraph,
  routerId: DeviceId,
  oldIface: number,
  newIface: number,
) {
  const router = dataGraph.getDevice(routerId);
  if (!router || !(router instanceof DataRouter)) {
    console.warn(`Device with ID ${routerId} is not a router.`);
    return;
  }

  let changed = false;
  router.routingTable.all().forEach((entry) => {
    if (entry.iface === oldIface) {
      entry.iface = newIface;
      router.routingTable.edit(entry.ip, entry, false);
      changed = true;
    }
  });

  if (changed) {
    dataGraph.notifyChanges();
  }
}

export function addRoutingTableEntry(
  dataGraph: DataGraph,
  routerId: DeviceId,
  ip: string,
  mask: string,
  ifaceStr: string,
): boolean {
  const router = dataGraph.getDevice(routerId);
  if (!router || !(router instanceof DataRouter)) {
    console.warn(`Device with ID ${routerId} is not a router.`);
    return false;
  }
  if (!IpAddress.isValidIP(ip)) {
    throw new InvalidIpError();
  }
  if (!IpAddress.isValidIP(mask)) {
    throw new InvalidMaskError();
  }

  const iface = parseIface(ifaceStr);

  // Check if an identical entry already exists
  const existing = router.routingTable.get(ip);
  if (
    existing &&
    existing.mask === mask &&
    existing.iface === iface &&
    !existing.deleted
  ) {
    return false;
  }

  const entry: RoutingEntry = { ip, mask, iface, edited: true, deleted: false };
  router.routingTable.add(entry);
  sortRoutingTable(router.routingTable);
  dataGraph.notifyChanges();
  return true;
}

function parseIface(ifaceStr: string): number {
  let iface: number;
  if (ifaceStr.startsWith("eth")) {
    iface = parseInt(ifaceStr.replace("eth", ""), 10);
  } else {
    iface = parseInt(ifaceStr, 10);
  }
  if (isNaN(iface) || iface < 0) {
    throw new InvalidIfaceError();
  }
  return iface;
}
