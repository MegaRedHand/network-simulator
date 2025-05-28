export const ALERT_MESSAGES = {
  START_PROGRAM_INVALID_INPUT: "Some inputs are missing to start the program.",
  NO_FREE_INTERFACES: (devices: string) =>
    `No free interfaces available for ${devices}.`,
  FAILED_TO_GENERATE_IMAGE: "Failed to generate image.",
  INVALID_MASK:
    "Invalid Mask format. Expected format: XXX.XXX.XXX.XXX where XXX is between 0 and 255.",
  INVALID_IP:
    "Invalid IP address format. Expected format: XXX.XXX.XXX.XXX where XXX is between 0 and 255.",
  INVALID_IFACE:
    "Invalid interface format. Expected format: ethX where X is a number.",
  EMPTY_INPUT: "Input cannot be empty.",
  PROGRAM_STARTED: "Program started successfully.",
  ROUTING_TABLE_ENTRY_EDITED: "Routing table entry edited successfully.",
  ROUTING_TABLE_ENTRY_ADDED: "Routing table entry added successfully.",
  ROUTING_TABLE_ENTRY_DELETED: "Routing table entry deleted successfully.",
  ROUTING_TABLE_REGENERATED: "Routing table regenerated successfully.",
  ARP_TABLE_ENTRY_EDITED: "ARP table entry edited successfully.",
  ARP_TABLE_ENTRY_ADDED: "ARP table entry added successfully.",
  ARP_TABLE_ENTRY_DELETED: "ARP table entry deleted successfully.",
  ARP_TABLE_REGENERATED: "ARP table regenerated successfully.",
  SWITCHING_TABLE_ENTRY_EDITED: "Switching table entry edited successfully.",
  SWITCHING_TABLE_ENTRY_ADDED: "Switching table entry added successfully.",
  SWITCHING_TABLE_ENTRY_DELETED: "Switching table entry deleted successfully.",
  SWITCHING_TABLE_REGENERATED: "Switching table regenerated successfully.",
  PARAMETER_UPDATED: "Parameter updated successfully.",
  NO_PROGRAM_SELECTED: "Please select a program to run.",
  LAYER_CHANGED:
    "Layer changed successfully. Programs that do not belong to the selected layer will be hidden but will continue running.",
  GRAPH_LOADED_SUCCESSFULLY: "Network loaded successfully.",
  FAILED_TO_LOAD_GRAPH: "Failed to load the network.",
  ARP_TABLE_REGENERATE_FAILED: "Failed to regenerate ARP table.",
  INVALID_MAC:
    "Invalid MAC address format. Expected format: XX:XX:XX:XX:XX:XX.",
  INVALID_PORT:
    "Invalid port number. Expected format: XX where XX is a positive number",
  INEXISTENT_PORT: (deviceId: string) =>
    `Port ${deviceId} does not exist. Please verify the switching table.`,
  NON_NEIGHBOR_PORT: (deviceId: string) =>
    `Port ${deviceId} is not a neighbor. Please verify the switching table.`,
};
