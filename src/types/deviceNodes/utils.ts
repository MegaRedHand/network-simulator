import { GlobalContext } from "../../context";
import { MacAddress } from "../../packets/ethernet";
import { IpAddress } from "../../packets/ip";
import { GraphNode, isLinkNode, isNetworkNode } from "../graphs/datagraph";
import { DeviceId } from "../graphs/datagraph";
import { ViewGraph } from "../graphs/viewgraph";
import { DeviceNode, DeviceType } from "./deviceNode";
import { HostNode } from "./hostNode";
import { RouterNode } from "./routerNode";
import { SwitchNode } from "./switchNode";

export interface CreateDevice {
  id: DeviceId;
  node: GraphNode;
  connections: DeviceId[];
}

export function createDevice(
  deviceInfo: CreateDevice,
  viewgraph: ViewGraph,
  ctx: GlobalContext,
): DeviceNode {
  const position: { x: number; y: number } = deviceInfo.node;
  let mac: MacAddress;

  if (isLinkNode(deviceInfo.node)) {
    mac = MacAddress.parse(deviceInfo.node.mac);
  }

  let ip: IpAddress;
  let mask: IpAddress;

  if (isNetworkNode(deviceInfo.node)) {
    ip = IpAddress.parse(deviceInfo.node.ip);
    mask = IpAddress.parse(deviceInfo.node.mask);
    mac = MacAddress.parse(deviceInfo.node.mac);
  }

  switch (deviceInfo.node.type) {
    case DeviceType.Router:
      return new RouterNode(
        deviceInfo.id,
        viewgraph,
        ctx,
        position,
        mac,
        ip,
        mask,
      );
    case DeviceType.Host:
      return new HostNode(
        deviceInfo.id,
        viewgraph,
        ctx,
        position,
        mac,
        ip,
        mask,
      );
    case DeviceType.Switch:
      return new SwitchNode(deviceInfo.id, viewgraph, ctx, position, mac);
  }
}
