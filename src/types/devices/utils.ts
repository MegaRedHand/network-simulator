import { IpAddress } from "../../packets/ip";
import { DeviceId } from "../graphs/datagraph";
import { ViewGraph } from "../graphs/viewgraph";
import { Device, DeviceType } from "./device";
import { Host } from "./host";
import { Router } from "./router";

export interface CreateDevice {
  id: DeviceId;
  type: DeviceType;
  x: number;
  y: number;
  ip: string;
  mask: string;
}

export function createDevice(
  deviceInfo: CreateDevice,
  viewgraph: ViewGraph,
): Device {
  const position: { x: number; y: number } = deviceInfo;
  const ip = IpAddress.parse(deviceInfo.ip);
  const mask = IpAddress.parse(deviceInfo.mask);

  switch (deviceInfo.type) {
    case DeviceType.Router:
      return new Router(deviceInfo.id, viewgraph, position, ip, mask);
    case DeviceType.Host:
      return new Host(deviceInfo.id, viewgraph, position, ip, mask);
  }
}
