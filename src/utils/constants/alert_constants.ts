export const ALERT_MESSAGES = {
  START_PROGRAM_INVALID_INPUT: "Some inputs are missing to start the program.",
  NO_FREE_INTERFACES: (devices: string) =>
    `No free interfaces available for ${devices}.`,
  FAILED_TO_GENERATE_IMAGE: "Failed to generate image.",
  INVALID_IP_MASK:
    "Invalid IP or Mask format. Expected format: XXX.XXX.XXX.XXX where XXX is between 0 and 255.",
  INVALID_IFACE:
    "Invalid interface format. Expected format: ethX where X is a number.",
  EMPTY_INPUT: "Input cannot be empty.",
  PROGRAM_STARTED: "Program started successfully.",
  ROUTING_TABLE_UPDATED: "Routing table updated successfully.",
  PARAMETER_UPDATED: "Parameter updated successfully.",
  NO_PROGRAM_SELECTED: "Please select a program to run.",
  ROUTING_TABLE_REGENERATED: "Routing table regenerated successfully.",
  LAYER_CHANGED:
    "Layer changed successfully. Programs that do not belong to the selected layer will be hidden but will continue running.",
  GRAPH_LOADED_SUCCESSFULLY: "network loaded successfully.",
  FAILED_TO_LOAD_GRAPH: "Failed to load the network.",
  ARP_TABLE_REGENERATED: "ARP table regenerated successfully.",
  ARP_TABLE_REGENERATE_FAILED: "Failed to regenerate ARP table.",
  INVALID_MAC:
    "Invalid MAC address format. Expected format: XX:XX:XX:XX:XX:XX.",
};
