import { DataSwitch, SwitchingEntry } from "../../data-devices/dSwitch";
import { DataGraph, DeviceId } from "../../graphs/datagraph";

/**
 * Retrieves the switching table of a switch.
 * @param deviceId - ID of the device (switch).
 * @returns An array of objects with the entries of the switching table.
 */
export function getSwitchingTable(
  datagraph: DataGraph,
  deviceId: DeviceId,
): SwitchingEntry[] {
  const device = datagraph.getDevice(deviceId);
  if (!device || !(device instanceof DataSwitch)) {
    console.warn(`Device with ID ${deviceId} is not a switch.`);
    return [];
  }

  // Convert the Map to an array and map it to a readable format
  return device.switchingTable.all();
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
  device.switchingTable.remove(mac);
  datagraph.notifyChanges();
}

/**
 * Manually updates an entry in the switching table.
 * @param deviceId - ID of the device (switch).
 * @param mac - MAC address of the entry to update.
 * @param col - Column index (0 for MAC, 1 for port).
 * @param newValue - New value for the field.
 */
export function saveSwitchingTableManualChange(
  datagraph: DataGraph,
  deviceId: DeviceId,
  mac: string,
  col: number,
  newValue: string,
): void {
  const device = datagraph.getDevice(deviceId);
  if (!device || !(device instanceof DataSwitch)) {
    console.warn(`Device with ID ${deviceId} is not a switch.`);
    return;
  }
  const entry = device.switchingTable.get(mac);
  if (col === 0) {
    // Update MAC (key)
    if (entry && entry.mac !== newValue) {
      device.switchingTable.edit(mac, { mac: newValue });
      datagraph.notifyChanges();
    }
  } else if (col === 1) {
    // Update port
    const port = parseInt(newValue, 10);
    if (!entry || entry.port !== port) {
      device.switchingTable.add({ mac, port, edited: true });
      datagraph.notifyChanges();
    }
  }
}
