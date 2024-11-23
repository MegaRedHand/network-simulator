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
  const { x, y, ip, mask } = deviceInfo;
  const position = { x, y };

  switch (deviceInfo.type) {
    case DeviceType.Router:
      return new Router(
        deviceInfo.id,
        viewgraph,
        position,
        IpAddress.parse(ip),
        IpAddress.parse(mask),
      );
    case DeviceType.Host:
      return new Host(
        deviceInfo.id,
        viewgraph,
        position,
        IpAddress.parse(ip),
        IpAddress.parse(mask),
      );
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
