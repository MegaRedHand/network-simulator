import { MacAddress } from "../../../packets/ethernet";
import { IpAddress } from "../../../packets/ip";
import {
  ARP_TABLE_CONSTANTS,
  InvalidIpError,
  InvalidMacError,
} from "../../../utils/constants/table_constants";
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

  device.arpTable.all().forEach((entry) => {
    if (!table.get(entry.ip)) {
      table.add({ ...entry });
    }
  });

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

export function saveARPTManualChange(
  dataGraph: DataGraph,
  deviceId: DeviceId,
  ip: string,
  col: number,
  newValue: string,
): boolean {
  const device = dataGraph.getDevice(deviceId);
  if (!device || !(device instanceof DataNetworkDevice)) {
    console.warn(`Device with ID ${deviceId} is not a network device.`);
    return false;
  }

  if (!ip || !newValue) {
    console.warn("IP or new value is empty.");
    return false;
  }

  // Validations
  if (col === ARP_TABLE_CONSTANTS.IP_COL_INDEX) {
    if (!IpAddress.isValidIP(newValue)) {
      throw new InvalidIpError();
    }
  } else if (col === ARP_TABLE_CONSTANTS.MAC_COL_INDEX) {
    if (!MacAddress.isValidMac(newValue)) {
      throw new InvalidMacError();
    }
  }

  const currentEntry = getArpTable(dataGraph, deviceId).find(
    (e) => e.ip === ip,
  );
  const internalEntry = device.arpTable.get(ip);

  if (col === ARP_TABLE_CONSTANTS.IP_COL_INDEX) {
    if (currentEntry && currentEntry.ip === newValue) return false;
    if (!internalEntry) {
      device.arpTable.add({
        ip: newValue,
        mac: currentEntry?.mac ?? "",
        edited: true,
      });
    } else {
      device.arpTable.edit(ip, { ip: newValue });
    }
    dataGraph.notifyChanges();
    return true;
  } else if (col === ARP_TABLE_CONSTANTS.MAC_COL_INDEX) {
    if (currentEntry && currentEntry.mac === newValue) return false;
    if (!internalEntry) {
      device.arpTable.add({ ip, mac: newValue, edited: true });
    } else {
      device.arpTable.edit(ip, { mac: newValue });
    }
    dataGraph.notifyChanges();
    return true;
  }
  throw new Error("Invalid column index.");
}
