import { DataNetworkDevice } from "../data-devices/dNetworkDevice";
import { DataGraph, DeviceId } from "../graphs/datagraph";

// Obtener la ARP Table en formato [{ ip, mac }]
export function getArpTable(
  dataGraph: DataGraph,
  deviceId: DeviceId,
): { ip: string; mac: string }[] {
  const device = dataGraph.getDevice(deviceId);
  if (!device || !(device instanceof DataNetworkDevice)) {
    return [];
  }

  // Create ARP table in desirable format
  const arpTable: { ip: string; mac: string }[] = [];

  for (const [currId, currDevice] of dataGraph.getDevices()) {
    if (currId === deviceId || !(currDevice instanceof DataNetworkDevice)) {
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

export function removeArpTableEntry(
  dataGraph: DataGraph,
  deviceId: DeviceId,
  ip: string,
): void {
  const device = dataGraph.getDevice(deviceId);
  if (!device || !(device instanceof DataNetworkDevice)) {
    console.warn(`Device with ID ${deviceId} is not a network device.`);
    return;
  }

  if (!device.arpTable.has(ip)) {
    console.warn(
      `IP ${ip} not found in ARP table. Creating a new entry with an empty MAC.`,
    );
    device.arpTable.set(ip, "");
  } else {
    device.arpTable.set(ip, "");
  }
  dataGraph.notifyChanges();
}

export function clearArpTable(dataGraph: DataGraph, deviceId: DeviceId): void {
  const device = dataGraph.getDevice(deviceId);
  if (!device || !(device instanceof DataNetworkDevice)) {
    console.warn(`Device with ID ${deviceId} is not a network device.`);
    return;
  }

  device.arpTable = new Map<string, string>();

  dataGraph.notifyChanges();
}

export function saveARPTManualChange(
  dataGraph: DataGraph,
  deviceId: DeviceId,
  ip: string,
  mac: string,
): void {
  const device = dataGraph.getDevice(deviceId);
  if (!device || !(device instanceof DataNetworkDevice)) {
    console.warn(`Device with ID ${deviceId} is not a network device.`);
    return;
  }

  if (!ip || !mac) {
    console.warn("Invalid IP or MAC address provided.");
    return;
  }

  device.arpTable.set(ip, mac);

  dataGraph.notifyChanges();
}
