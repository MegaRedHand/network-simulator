import { GlobalContext } from "../../context";
import { IpAddress } from "../../packets/ip";
import { Position } from "../common";
import { DataNode, isNetworkNode, isRouter } from "../graphs/datagraph";
import { ViewGraph } from "../graphs/viewgraph";
import { ViewDevice, DeviceType } from "./vDevice";
import { ViewHost } from "./vHost";
import { ViewRouter } from "./vRouter";
import { ViewSwitch } from "./vSwitch";

export function createViewDevice(
  deviceInfo: DataNode,
  viewgraph: ViewGraph,
  ctx: GlobalContext,
): ViewDevice {
  const position: Position = deviceInfo;

  let mask: IpAddress;

  if (isNetworkNode(deviceInfo)) {
    mask = IpAddress.parse(deviceInfo.mask);
  }

  let packetQueueSize: number;
  let bytesPerSecond: number;

  if (isRouter(deviceInfo)) {
    packetQueueSize = deviceInfo.packetQueueSize;
    bytesPerSecond = deviceInfo.bytesPerSecond;
  }
  const { id, interfaces, tag } = deviceInfo;

  switch (deviceInfo.type) {
    case DeviceType.Router:
      return new ViewRouter(
        id,
        viewgraph,
        ctx,
        position,
        interfaces,
        tag,
        mask,
        packetQueueSize,
        bytesPerSecond,
      );
    case DeviceType.Host:
      return new ViewHost(id, viewgraph, ctx, position, interfaces, tag, mask);
    case DeviceType.Switch:
      return new ViewSwitch(id, viewgraph, ctx, position, interfaces, tag);
  }
}
