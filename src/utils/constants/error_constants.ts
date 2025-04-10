export const ERROR_MESSAGES = {
  START_PROGRAM_INVALID_INPUT: "Some inputs are missing to start the program.",
  NO_FREE_INTERFACES: (devices: string) =>
    `No free interfaces available for ${devices}.`,
  FAILED_TO_GENERATE_IMAGE: "Failed to generate image.",
  INVALID_IP_MASK:
    "Invalid IP or Mask format. Expected format: XXX.XXX.XXX.XXX where XXX is between 0 and 255.",
  INVALID_IFACE:
    "Invalid interface format. Expected format: ethX where X is a number.",
  EMPTY_INPUT: "Input cannot be empty.",
};
