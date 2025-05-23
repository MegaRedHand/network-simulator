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
  return router.routingTable;
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

  switch (colIndex) {
    case 0:
      if (!router.routingTableEditedIps.includes(originalIp)) {
        router.routingTableEditedIps.push(originalIp);
      }
      entry.ip = newValue;
      break;
    case 1:
      entry.mask = newValue;
      break;
    case 2:
      entry.iface = newValue.startsWith("eth")
        ? parseInt(newValue.replace("eth", ""), 10)
        : parseInt(newValue, 10);
      break;
    default:
      console.warn(`Invalid column index: ${colIndex}`);
      return;
  }

  router.routingTableEdited = true;
  dataGraph.notifyChanges();
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
