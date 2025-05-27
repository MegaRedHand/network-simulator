import { MacAddress } from "../../../packets/ethernet";
import {
  InvalidMacError,
  InvalidPortError,
  SWITCHING_TABLE_CONSTANTS,
} from "../../../utils/constants/table_constants";
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

  return device.switchingTable.allActive();
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
  device.switchingTable.softRemove(mac);
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
): boolean {
  const device = datagraph.getDevice(deviceId);
  if (!device || !(device instanceof DataSwitch)) {
    console.warn(`Device with ID ${deviceId} is not a switch.`);
    return false;
  }
  const entry = device.switchingTable.get(mac);

  if (col === SWITCHING_TABLE_CONSTANTS.MAC_COL_INDEX) {
    // Validate MAC
    if (!MacAddress.isValidMac(newValue.trim())) {
      throw new InvalidMacError();
    }
    if (entry && entry.mac === newValue) return false;
    if (entry) {
      device.switchingTable.edit(mac, { mac: newValue.trim() });
      datagraph.notifyChanges();
      return true;
    }
  } else if (col === SWITCHING_TABLE_CONSTANTS.PORT_COL_INDEX) {
    // Validate port
    const port = parseInt(newValue, 10);
    if (isNaN(port) || port < 0) {
      throw new InvalidPortError();
    }
    if (entry && entry.port === port) return false;
    device.switchingTable.add({ mac, port, edited: true });
    datagraph.notifyChanges();
    return true;
  }
  console.warn(`Invalid column index: ${col}`);
}

/**
 * Updates all entries in the switching table that match the old port, setting them to the new port.
 * @param datagraph - The data graph.
 * @param deviceId - ID of the switch device.
 * @param oldPort - The port number to replace.
 * @param newPort - The new port number to set.
 */
export function updateSwitchingTablePort(
  datagraph: DataGraph,
  deviceId: DeviceId,
  oldPort: number,
  newPort: number,
): void {
  const device = datagraph.getDevice(deviceId);
  if (!device || !(device instanceof DataSwitch)) {
    console.warn(`Device with ID ${deviceId} is not a switch.`);
    return;
  }

  let changed = false;
  device.switchingTable.all().forEach((entry) => {
    if (entry.port === oldPort) {
      entry.port = newPort;
      device.switchingTable.edit(entry.mac, entry, false);
      changed = true;
    }
  });

  if (changed) {
    datagraph.notifyChanges?.();
  }
}
