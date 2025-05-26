import { ArpEntry, DataNetworkDevice } from "../../data-devices/dNetworkDevice";
import { DataGraph, DeviceId } from "../../graphs/datagraph";
import { Table } from "./table";

export function getArpTable(
  dataGraph: DataGraph,
  deviceId: DeviceId,
): ArpEntry[] {
  const device = dataGraph.getDevice(deviceId);
  if (!device || !(device instanceof DataNetworkDevice)) {
    return [];
  }

  const table = new Table<ArpEntry>("ip");

  for (const [currId, currDevice] of dataGraph.getDevices()) {
    if (currId === deviceId || !(currDevice instanceof DataNetworkDevice)) {
      continue;
    }
    currDevice.interfaces.forEach((iface) => {
      const resolved = device.resolveAddress(iface.ip);
      if (resolved) {
        table.add({
          ip: iface.ip?.toString(),
          mac: resolved.mac.toString(),
          edited: resolved.edited,
        });
      }
    });
  }
  return table.all();
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

  const prev = device.arpTable.get(ip);
  if (!prev) {
    console.warn(
      `IP ${ip} not found in ARP table. Creating a new entry with an empty MAC.`,
    );
  }
  device.arpTable.add({ ip, mac: "", edited: false });
  dataGraph.notifyChanges();
}

export function clearArpTable(dataGraph: DataGraph, deviceId: DeviceId): void {
  const device = dataGraph.getDevice(deviceId);
  if (!device || !(device instanceof DataNetworkDevice)) {
    console.warn(`Device with ID ${deviceId} is not a network device.`);
    return;
  }

  device.arpTable.clear();

  dataGraph.notifyChanges();
}

// check if this is ok
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

  const currentEntry = getArpTable(dataGraph, deviceId).find(
    (e) => e.ip === ip,
  );

  if (currentEntry && currentEntry.mac === mac) {
    return;
  }

  device.arpTable.add({ ip, mac, edited: true });
  dataGraph.notifyChanges();
}
