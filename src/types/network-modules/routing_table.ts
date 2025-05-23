import { showSuccess } from "../../graphics/renderables/alert_manager";
import { compareIps, IpAddress } from "../../packets/ip";
import { ALERT_MESSAGES } from "../../utils/constants/alert_constants";
import { DataRouter, DataHost, DataNetworkDevice } from "../data-devices";
import { DataGraph, DeviceId, RoutingTableEntry } from "../graphs/datagraph";

export function regenerateRoutingTableClean(
  dataGraph: DataGraph,
  id: DeviceId,
) {
  const router = dataGraph.getDevice(id);
  if (!(router instanceof DataRouter)) return;

  router.routingTable = generateRoutingTable(dataGraph, id);
  router.routingTableEditedIps = [];
  router.routingTableEdited = false;
  sortRoutingTable(router.routingTable);
}

// Regenera la tabla, respetando edits y bloqueadas
export function regenerateRoutingTable(dataGraph: DataGraph, id: DeviceId) {
  const router = dataGraph.getDevice(id);
  if (!(router instanceof DataRouter)) return;

  if (!router.routingTableEditedIps) {
    router.routingTableEditedIps = [];
  }

  if (router.routingTableEdited) {
    const newEntries = generateRoutingTable(dataGraph, id);
    newEntries.forEach((entry) => {
      if (
        !router.routingTableEditedIps.includes(entry.ip) &&
        !router.routingTable.some(
          (e) => e.ip === entry.ip && e.iface === entry.iface,
        )
      ) {
        router.routingTable.push(entry);
      }
    });
  } else {
    router.routingTable = generateRoutingTable(dataGraph, id);
  }
  sortRoutingTable(router.routingTable);
}

export function regenerateAllRoutingTables(dataGraph: DataGraph) {
  for (const [id] of dataGraph.getDevices()) {
    regenerateRoutingTable(dataGraph, id);
  }
}

export function generateRoutingTable(
  dataGraph: DataGraph,
  id: DeviceId,
): RoutingTableEntry[] {
  const router = dataGraph.deviceGraph.getVertex(id);
  if (!(router instanceof DataRouter)) {
    return [];
  }

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

  const newTable: RoutingTableEntry[] = [];

  parents.forEach((currentId, childId) => {
    const dstId = childId;
    if (dstId === id) return;
    // Get edge connection both devices
    console.debug(`currentId: ${currentId}, childId: ${childId}`);
    const edge = dataGraph.getConnection(currentId, childId);
    // Get childId interface involved in connection
    const receivingIfaceNum =
      edge.from.id === childId ? edge.from.iface : edge.to.iface;

    while (currentId !== id) {
      const parentId = parents.get(currentId);
      childId = currentId;
      currentId = parentId;
    }

    const dst = dataGraph.deviceGraph.getVertex(dstId);
    const receivingIface = dst.interfaces[receivingIfaceNum];

    if (dst instanceof DataNetworkDevice) {
      const dataEdge = dataGraph.deviceGraph.getEdge(currentId, childId);
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

  console.log(`Generated routing table for router ID ${id}:`, newTable);
  return newTable;
}

export function getRoutingTable(dataGraph: DataGraph, id: DeviceId) {
  const device = dataGraph.getDevice(id);
  if (!device || !(device instanceof DataRouter)) {
    return [];
  }
  return device.routingTable;
}

export function sortRoutingTable(routingTable: RoutingTableEntry[]) {
  routingTable.sort((a, b) => {
    const prefixLengthA = IpAddress.getPrefixLength(IpAddress.parse(a.mask)); // ej: 255.255.255.0 → 24
    const prefixLengthB = IpAddress.getPrefixLength(IpAddress.parse(b.mask));

    if (prefixLengthA !== prefixLengthB) {
      return prefixLengthB - prefixLengthA;
    }

    const ipA = IpAddress.parse(a.ip);
    const ipB = IpAddress.parse(b.ip);
    return compareIps(ipA, ipB);
  });
}

export function saveRoutingTableManualChange(
  dataGraph: DataGraph,
  routerId: DeviceId,
  rowIndex: number,
  colIndex: number,
  newValue: string,
) {
  const router = dataGraph.getDevice(routerId);
  if (!router || !(router instanceof DataRouter)) {
    console.warn(`Device with ID ${routerId} is not a router.`);
    return;
  }

  if (!router.routingTableEditedIps) {
    router.routingTableEditedIps = [];
  }

  if (rowIndex < 0 || rowIndex >= router.routingTable.length) {
    console.warn(`Invalid row index: ${rowIndex}`);
    return;
  }

  const entry = router.routingTable[rowIndex];
  const originalIp = entry.ip;

  let changed = false;

  switch (colIndex) {
    case 0: // IP
      if (entry.ip !== newValue) {
        if (!router.routingTableEditedIps.includes(originalIp)) {
          router.routingTableEditedIps.push(originalIp);
        }
        entry.ip = newValue;
        changed = true;
      }
      break;
    case 1: // Mask
      if (entry.mask !== newValue) {
        entry.mask = newValue;
        changed = true;
      }
      break;
    case 2: {
      // Iface
      const ifaceValue = newValue.startsWith("eth")
        ? parseInt(newValue.replace("eth", ""), 10)
        : parseInt(newValue, 10);
      if (entry.iface !== ifaceValue) {
        entry.iface = ifaceValue;
        changed = true;
      }
      break;
    }
    default:
      console.warn(`Invalid column index: ${colIndex}`);
      return;
  }

  if (changed) {
    sortRoutingTable(router.routingTable);
    router.routingTableEdited = true;
    dataGraph.notifyChanges();
    showSuccess(ALERT_MESSAGES.ROUTING_TABLE_UPDATED);
  }
}

export function removeRoutingTableRow(
  dataGraph: DataGraph,
  routerId: DeviceId,
  rowIndex: number,
) {
  const router = dataGraph.getDevice(routerId);
  if (!router || !(router instanceof DataRouter)) {
    console.warn(`Device with ID ${routerId} is not a router.`);
    return;
  }

  if (!router.routingTableEditedIps) {
    router.routingTableEditedIps = [];
  }

  if (rowIndex < 0 || rowIndex >= router.routingTable.length) {
    console.warn(`Invalid row index: ${rowIndex}`);
    return;
  }

  const entry = router.routingTable[rowIndex];

  if (!router.routingTableEditedIps.includes(entry.ip)) {
    router.routingTableEditedIps.push(entry.ip);
  }

  router.routingTable.splice(rowIndex, 1);

  router.routingTableEdited = true;
  dataGraph.notifyChanges();
}

export function clearEditedIp(
  dataGraph: DataGraph,
  routerId: DeviceId,
  ip: string,
) {
  const router = dataGraph.getDevice(routerId);
  if (!router || !(router instanceof DataRouter)) {
    console.warn(`Device with ID ${routerId} is not a router.`);
    return;
  }
  if (!router.routingTableEditedIps) {
    router.routingTableEditedIps = [];
  }
  const index = router.routingTableEditedIps.indexOf(ip);
  if (index !== -1) {
    router.routingTableEditedIps.splice(index, 1);
  }
}

export function clearEditedIpsForEdge(
  dataGraph: DataGraph,
  datagraphEdge: {
    from: { id: DeviceId; iface: number };
    to: { id: DeviceId; iface: number };
  },
) {
  const fromDevice = dataGraph.getDevice(datagraphEdge.from.id);
  const toDevice = dataGraph.getDevice(datagraphEdge.to.id);

  const toIp = toDevice?.interfaces?.[datagraphEdge.to.iface]?.ip?.toString();
  const fromIp =
    fromDevice?.interfaces?.[datagraphEdge.from.iface]?.ip?.toString();

  if (toIp) {
    clearEditedIp(dataGraph, datagraphEdge.from.id, toIp);
  }
  if (fromIp) {
    clearEditedIp(dataGraph, datagraphEdge.to.id, fromIp);
  }
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
  router.routingTable.forEach((entry) => {
    if (entry.iface === oldIface) {
      entry.iface = newIface;
      changed = true;
    }
  });

  if (changed) {
    dataGraph.notifyChanges?.();
  }
}

export function addRoutingTableEntry(
  dataGraph: DataGraph,
  routerId: DeviceId,
  entry: RoutingTableEntry,
) {
  const router = dataGraph.getDevice(routerId);
  if (!router || !(router instanceof DataRouter)) {
    console.warn(`Device with ID ${routerId} is not a router.`);
    return;
  }

  router.routingTable.push(entry);
  sortRoutingTable(router.routingTable);
  router.routingTableEdited = true;
  if (!router.routingTableEditedIps) {
    router.routingTableEditedIps = [];
  }
  if (!router.routingTableEditedIps.includes(entry.ip)) {
    router.routingTableEditedIps.push(entry.ip);
  }
  dataGraph.notifyChanges?.();
}
