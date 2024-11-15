import { ViewGraph } from "../graphs/viewgraph";
import { Device, DeviceType } from "./device";
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
