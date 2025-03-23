import { GlobalContext } from "../../context";
import { MacAddress } from "../../packets/ethernet";
import { IpAddress } from "../../packets/ip";
import { Position } from "../common";
import { Device, NetworkDevice } from "../devices";
import { DeviceId, DataNode, isNetworkNode } from "../graphs/datagraph";
import { ViewGraph } from "../graphs/viewgraph";
import { DeviceNode, DeviceType } from "./deviceNode";
import { HostNode } from "./hostNode";
import { RouterNode } from "./routerNode";
import { SwitchNode } from "./switchNode";

export interface CreateDevice {
  id: DeviceId;
  node: Device;
  connections: DeviceId[];
}

export function createDeviceNode(
  deviceInfo: DataNode,
  viewgraph: ViewGraph,
  ctx: GlobalContext,
): DeviceNode {
  // const position: { x: number; y: number } = deviceInfo.node;
  // let mac: MacAddress;

  // mac = structuredClone(deviceInfo.mac);

  // let ip: IpAddress;
  // let mask: IpAddress;

  // if (deviceInfo.node instanceof NetworkDevice) {
  //   ip = structuredClone(deviceInfo.node.ip);
  //   mask = structuredClone(deviceInfo.node.ipMask);
  // }
  const position: Position = deviceInfo;

  const mac: MacAddress = MacAddress.parse(deviceInfo.mac);

  let ip: IpAddress;
  let mask: IpAddress;

  if (isNetworkNode(deviceInfo)) {
    ip = IpAddress.parse(deviceInfo.ip);
    mask = IpAddress.parse(deviceInfo.mask);
  }
  switch (deviceInfo.type) {
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
