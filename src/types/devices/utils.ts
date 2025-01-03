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

export function layerFromName(name: string): Layer {
  switch (name) {
    case "application":
      // Lógica específica para la capa de aplicación
      console.log("Application Layer selected");
      return Layer.App;
    case "transport":
      // Lógica específica para la capa de transporte
      console.log("Transport Layer selected");
      return Layer.Transport;
    case "network":
      // Lógica específica para la capa de red
      console.log("Network Layer selected");
      return Layer.Network;
    case "link":
      // Lógica específica para la capa de enlace
      console.log("Link Layer selected");
      return Layer.Link;
  }
}

export function layerIncluded(layer1: Layer, layer2: Layer) {
  // Determines whether layer1 is included within layer2’s abstraction.
  console.log(`${layer1.valueOf()} <= ${layer2.valueOf()}`);
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
