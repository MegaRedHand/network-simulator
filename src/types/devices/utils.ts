import { IpAddress } from "../../packets/ip";
import { ViewGraph } from "../graphs/viewgraph";
import { Device, DeviceType, Layer } from "./device";
import { Host } from "./host";
import { Router } from "./router";

export interface CreateDevice {
  id: number;
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

const layerFromNameMap: Record<string, Layer> = {
  application: Layer.App,
  transport: Layer.Transport,
  network: Layer.Network,
  link: Layer.Link,
};

const layerToNameMap = new Map([
  [Layer.App, "application"],
  [Layer.Transport, "transport"],
  [Layer.Network, "network"],
  [Layer.Link, "link"],
]);

export function layerFromName(name: string): Layer {
  return layerFromNameMap[name];
}

export function layerToName(layer: Layer): string {
  return layerToNameMap.get(layer);
}

export function layerIncluded(layer1: Layer, layer2: Layer) {
  // Determines whether layer1 is included within layer2’s abstraction.
  return layer1.valueOf() <= layer2.valueOf();
}

export function layerFromType(type: DeviceType) {
  switch (type) {
    case DeviceType.Router:
      return Layer.Network;
    case DeviceType.Host:
      return Layer.App;
  }
}
