export class InvalidMacError extends Error {}
export class InvalidPortError extends Error {}
export class InvalidIpError extends Error {}
export class InvalidMaskError extends Error {}
export class InvalidIfaceError extends Error {}

// ARP Table Constants
export const ARP_TABLE_CONSTANTS = {
  IP_COL_INDEX: 0,
  MAC_COL_INDEX: 1,
  TABLE_FIELDS_PER_ROW: 2,
} as const;

// Router Constants
export const ROUTER_TABLE_CONSTANTS = {
  IP_COL_INDEX: 0,
  MASK_COL_INDEX: 1,
  INTERFACE_COL_INDEX: 2,
  REGENERATE_COL_INDEX: 3,
  TABLE_FIELDS_PER_ROW: 3,
} as const;

export const FORWARDING_TABLE_CONSTANTS = {
  MAC_COL_INDEX: 0,
  PORT_COL_INDEX: 1,
  TABLE_FIELDS_PER_ROW: 2,
} as const;
