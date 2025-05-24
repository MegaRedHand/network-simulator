import { DataSwitch } from "../data-devices/dSwitch";
import { DataGraph, DeviceId } from "../graphs/datagraph";

/**
 * Retrieves the switching table of a switch.
 * @param deviceId - ID of the device (switch).
 * @returns An array of objects with the entries of the switching table.
 */
export function getSwitchingTable(
  datagraph: DataGraph,
  deviceId: DeviceId,
): { mac: string; port: number; edited: boolean }[] {
  const device = datagraph.getDevice(deviceId);
  if (!device || !(device instanceof DataSwitch)) {
    console.warn(`Device with ID ${deviceId} is not a switch.`);
    return [];
  }

  // Convert the Map to an array and map it to a readable format
  return Array.from(device.switchingTable.entries()).map(
    ([mac, { port, edited }]) => ({
      mac,
      port,
      edited,
    }),
  );
}

/**
 * Clears the switching table of a switch.
 * @param deviceId - ID of the device (switch).
 */
export function clearSwitchingTable(
  datagraph: DataGraph,
  deviceId: DeviceId,
): void {
  const device = datagraph.getDevice(deviceId);
  if (!device || !(device instanceof DataSwitch)) {
    console.warn(`Device with ID ${deviceId} is not a switch.`);
    return;
  }

  // Clear the switching table
  device.switchingTable.clear();
  console.log(`Switching table cleared for device ID ${deviceId}.`);

  // Notify changes
  datagraph.notifyChanges();
}

/**
 * Removes a specific entry from the switching table.
 * @param deviceId - ID of the device (switch).
 * @param mac - MAC address of the entry to remove.
 */
export function removeSwitchingTableEntry(
  datagraph: DataGraph,
  deviceId: DeviceId,
  mac: string,
): void {
  const device = datagraph.getDevice(deviceId);
  if (!device || !(device instanceof DataSwitch)) {
    console.warn(`Device with ID ${deviceId} is not a switch.`);
    return;
  }

  // Remove the entry from the Map
  if (device.switchingTable.has(mac)) {
    device.switchingTable.delete(mac);
    console.log(
      `Entry with MAC ${mac} removed from switching table of device ID ${deviceId}.`,
    );
    datagraph.notifyChanges();
  } else {
    console.warn(
      `Entry with MAC ${mac} not found in switching table of device ID ${deviceId}.`,
    );
  }
}

/**
 * Manually updates an entry in the switching table.
 * @param deviceId - ID of the device (switch).
 * @param mac - MAC address of the entry to update.
 * @param port - New port associated with the MAC address.
 */
export function saveSwitchingTableManualChange(
  datagraph: DataGraph,
  deviceId: DeviceId,
  mac: string,
  newPort: number,
): void {
  const device = datagraph.getDevice(deviceId);
  if (!device || !(device instanceof DataSwitch)) {
    console.warn(`Device with ID ${deviceId} is not a switch.`);
    return;
  }

  const entry = device.switchingTable.get(mac);

  let changed = false;

  if (!entry) {
    device.switchingTable.set(mac, { port: newPort, edited: true });
    changed = true;
  } else if (entry.port !== newPort) {
    device.switchingTable.set(mac, { port: newPort, edited: true });
    changed = true;
  }

  if (changed) {
    datagraph.notifyChanges();
  }
}
