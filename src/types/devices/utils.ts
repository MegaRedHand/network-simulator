import { IpAddress } from "../../packets/ip";
import { GraphNode } from "../graphs/datagraph";
import { DeviceId } from "../graphs/datagraph";
import { ViewGraph } from "../graphs/viewgraph";
import { Device, DeviceType } from "./device";
import { Host } from "./host";
import { Router } from "./router";
import { Switch } from "./switch";

export interface CreateDevice {
  id: DeviceId;
  node: GraphNode;
}

export function createDevice(
  deviceInfo: CreateDevice,
  viewgraph: ViewGraph,
): Device {
  const position: { x: number; y: number } = deviceInfo.node;
  const ip = IpAddress.parse(deviceInfo.node.ip);
  const mask = IpAddress.parse(deviceInfo.node.mask);

  switch (deviceInfo.node.type) {
    case DeviceType.Router:
      return new Router(deviceInfo.id, viewgraph, position, ip, mask);
    case DeviceType.Host:
      return new Host(deviceInfo.id, viewgraph, position, ip, mask);
    case DeviceType.Switch:
      return new Switch(deviceInfo.id, viewgraph, position);
  }
}
