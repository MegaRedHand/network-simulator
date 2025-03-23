import { GlobalContext } from "../../context";
import { MacAddress } from "../../packets/ethernet";
import { IpAddress } from "../../packets/ip";
import { Position } from "../common";
import { DataDevice } from "../data-devices";
import { DeviceId, DataNode, isNetworkNode } from "../graphs/datagraph";
import { ViewGraph } from "../graphs/viewgraph";
import { ViewDevice, DeviceType } from "./vDevice";
import { ViewHost } from "./vHost";
import { ViewRouter } from "./vRouter";
import { ViewSwitch } from "./vSwitch";

export interface CreateDevice {
  id: DeviceId;
  node: DataDevice;
  connections: DeviceId[];
}

export function createDeviceNode(
  deviceInfo: DataNode,
  viewgraph: ViewGraph,
  ctx: GlobalContext,
): ViewDevice {
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
      return new ViewRouter(
        deviceInfo.id,
        viewgraph,
        ctx,
        position,
        mac,
        ip,
        mask,
      );
    case DeviceType.Host:
      return new ViewHost(
        deviceInfo.id,
        viewgraph,
        ctx,
        position,
        mac,
        ip,
        mask,
      );
    case DeviceType.Switch:
      return new ViewSwitch(deviceInfo.id, viewgraph, ctx, position, mac);
  }
}
