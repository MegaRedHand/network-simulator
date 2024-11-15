import { ViewGraph } from "../graphs/viewgraph";
import { Device, DeviceType, Layer } from "./device";
import { Pc } from "./pc";
import { Router } from "./router";
import { Server } from "./server";

export function createDevice(
  type: DeviceType,
  id: number,
  viewgraph: ViewGraph,
  position: { x: number; y: number } | null = null,
): Device {
  switch (type) {
    case DeviceType.Router:
      return new Router(id, viewgraph, position);
    case DeviceType.Server:
      return new Server(id, viewgraph, position);
    case DeviceType.Pc:
      return new Pc(id, viewgraph, position);
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
