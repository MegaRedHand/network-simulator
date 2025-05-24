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
): { mac: string; port: number }[] {
  const device = datagraph.getDevice(deviceId);
  if (!device || !(device instanceof DataSwitch)) {
    console.warn(`Device with ID ${deviceId} is not a switch.`);
    return [];
  }

  // Convert the Map to an array and map it to a readable format
  return Array.from(device.switchingTable.entries()).map(([mac, port]) => ({
    mac,
    port,
  }));
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
  port: number,
): void {
  const device = datagraph.getDevice(deviceId);
  if (!device || !(device instanceof DataSwitch)) {
    console.warn(`Device with ID ${deviceId} is not a switch.`);
    return;
  }

  // Update or add the entry in the Map
  device.switchingTable.set(mac, port);
  console.log(
    `Updated/added entry in switching table for device ID ${deviceId}: MAC=${mac}, Port=${port}.`,
  );

  // Notify changes
  datagraph.notifyChanges();
}
