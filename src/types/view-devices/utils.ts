import { GlobalContext } from "../../context";
import { MacAddress } from "../../packets/ethernet";
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

  const mac: MacAddress = MacAddress.parse(deviceInfo.mac);

  let ip: IpAddress;
  let mask: IpAddress;

  if (isNetworkNode(deviceInfo)) {
    ip = IpAddress.parse(deviceInfo.ip);
    mask = IpAddress.parse(deviceInfo.mask);
  }

  let packetQueueSize: number;
  let timePerByte: number;

  if (isRouter(deviceInfo)) {
    packetQueueSize = deviceInfo.packetQueueSize;
    timePerByte = deviceInfo.timePerByte;
  }
  const { id, interfaces, tag } = deviceInfo;

  switch (deviceInfo.type) {
    case DeviceType.Router:
      return new ViewRouter(
        id,
        viewgraph,
        ctx,
        position,
        mac,
        interfaces,
        tag,
        ip,
        mask,
        packetQueueSize,
        timePerByte,
      );
    case DeviceType.Host:
      return new ViewHost(
        id,
        viewgraph,
        ctx,
        position,
        mac,
        interfaces,
        tag,
        ip,
        mask,
      );
    case DeviceType.Switch:
      return new ViewSwitch(id, viewgraph, ctx, position, mac, interfaces, tag);
  }
}
