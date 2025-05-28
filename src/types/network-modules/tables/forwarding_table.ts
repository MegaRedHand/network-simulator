import { MacAddress } from "../../../packets/ethernet";
import {
  InvalidMacError,
  InvalidPortError,
  FORWARDING_TABLE_CONSTANTS,
} from "../../../utils/constants/table_constants";
import { DataSwitch, ForwardingEntry } from "../../data-devices/dSwitch";
import { DataGraph, DeviceId } from "../../graphs/datagraph";

/**
 * Retrieves the forwarding table of a switch.
 * @param deviceId - ID of the device (switch).
 * @returns An array of objects with the entries of the forwarding table.
 */
export function getForwardingTable(
  datagraph: DataGraph,
  deviceId: DeviceId,
): ForwardingEntry[] {
  const device = datagraph.getDevice(deviceId);
  if (!device || !(device instanceof DataSwitch)) {
    console.warn(`Device with ID ${deviceId} is not a switch.`);
    return [];
  }

  return device.forwardingTable.allActive();
}

/**
 * Clears the forwarding table of a switch.
 * @param deviceId - ID of the device (switch).
 */
export function clearForwardingTable(
  datagraph: DataGraph,
  deviceId: DeviceId,
): void {
  const device = datagraph.getDevice(deviceId);
  if (!device || !(device instanceof DataSwitch)) {
    console.warn(`Device with ID ${deviceId} is not a switch.`);
    return;
  }

  // Clear the forwarding table
  device.forwardingTable.clear();
  console.log(`Forwarding table cleared for device ID ${deviceId}.`);

  // Notify changes
  datagraph.notifyChanges();
}

/**
 * Removes a specific entry from the forwarding table.
 * @param deviceId - ID of the device (switch).
 * @param mac - MAC address of the entry to remove.
 */
export function removeForwardingTableEntry(
  datagraph: DataGraph,
  deviceId: DeviceId,
  mac: string,
): void {
  const device = datagraph.getDevice(deviceId);
  if (!device || !(device instanceof DataSwitch)) {
    console.warn(`Device with ID ${deviceId} is not a switch.`);
    return;
  }
  device.forwardingTable.softRemove(mac);
  datagraph.notifyChanges();
}

/**
 * Manually updates an entry in the forwarding table.
 * @param deviceId - ID of the device (switch).
 * @param mac - MAC address of the entry to update.
 * @param col - Column index (0 for MAC, 1 for port).
 * @param newValue - New value for the field.
 */
export function saveForwardingTableManualChange(
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

  if (!MacAddress.isValidMac(mac)) {
    throw new InvalidMacError();
  }
  const entry = device.forwardingTable.get(mac);

  if (col === FORWARDING_TABLE_CONSTANTS.MAC_COL_INDEX) {
    // Validate MAC address
    if (!MacAddress.isValidMac(newValue)) {
      throw new InvalidMacError();
    }
    if (entry && entry.mac === newValue) return false;
    if (entry) {
      device.forwardingTable.edit(mac, { mac: newValue.trim() });
      datagraph.notifyChanges();
      return true;
    }
  } else if (col === FORWARDING_TABLE_CONSTANTS.PORT_COL_INDEX) {
    // Validate port
    const port = parseInt(newValue, 10);
    if (isNaN(port) || port < 0) {
      throw new InvalidPortError();
    }
    if (entry && entry.port === port) return false;
    device.forwardingTable.add({ mac, port, edited: true });
    datagraph.notifyChanges();
    return true;
  }
  console.warn(`Invalid column index: ${col}`);
}

/**
 * Updates all entries in the forwarding table that match the old port, setting them to the new port.
 * @param datagraph - The data graph.
 * @param deviceId - ID of the switch device.
 * @param oldPort - The port number to replace.
 * @param newPort - The new port number to set.
 */
export function updateForwardingTablePort(
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
  device.forwardingTable.all().forEach((entry) => {
    if (entry.port === oldPort) {
      entry.port = newPort;
      device.forwardingTable.edit(entry.mac, entry, false);
      changed = true;
    }
  });

  if (changed) {
    datagraph.notifyChanges?.();
  }
}
