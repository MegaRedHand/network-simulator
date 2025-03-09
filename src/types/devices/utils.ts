import { GlobalContext } from "../../context";
import { MacAddress } from "../../packets/ethernet";
import { IpAddress } from "../../packets/ip";
import { GraphNode, isLinkNode, isNetworkNode } from "../graphs/datagraph";
import { DeviceId } from "../graphs/datagraph";
import { ViewGraph } from "../graphs/viewgraph";
import { Device, DeviceType } from "./device";
import { Host } from "./host";
import { Router } from "./router";
import { Switch } from "./switch";

export interface CreateDevice {
  id: DeviceId;
  node: GraphNode;
  connections: DeviceId[];
}

export function createDevice(
  id: DeviceId,
  node: GraphNode,
  viewgraph: ViewGraph,
  ctx: GlobalContext,
): Device {
  const position: { x: number; y: number } = node;
  let mac: MacAddress;

  if (isLinkNode(node)) {
    mac = MacAddress.parse(node.mac);
  }

  let ip: IpAddress;
  let mask: IpAddress;

  if (isNetworkNode(node)) {
    ip = IpAddress.parse(node.ip);
    mask = IpAddress.parse(node.mask);
    mac = MacAddress.parse(node.mac);
  }

  switch (node.type) {
    case DeviceType.Router:
      return new Router(id, viewgraph, ctx, position, mac, ip, mask);
    case DeviceType.Host:
      return new Host(id, viewgraph, ctx, position, mac, ip, mask);
    case DeviceType.Switch:
      return new Switch(id, viewgraph, ctx, position, mac);
  }
}
