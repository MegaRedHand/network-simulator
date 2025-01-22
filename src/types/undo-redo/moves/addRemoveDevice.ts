import { DeviceType } from "../../devices/device";
import { CreateDevice } from "../../devices/utils";
import { DeviceId, GraphNode, RoutingTableEntry } from "../../graphs/datagraph";
import { EdgeId, ViewGraph } from "../../graphs/viewgraph";
import { Move, TypeMove } from "./move";

// Superclass for AddDeviceMove and RemoveDeviceMove
export abstract class AddRemoveDeviceMove implements Move {
  type: TypeMove;
  data: CreateDevice;
  abstract undo(viewgraph: ViewGraph): void;
  abstract redo(viewgraph: ViewGraph): void;

  constructor(data: CreateDevice) {
    this.data = data;
  }

  addDevice(viewgraph: ViewGraph) {
    const datagraph = viewgraph.getDataGraph();

    const deviceInfo = {
      type: this.data.type,
      x: this.data.x,
      y: this.data.y,
      ip: this.data.ip,
      mask: this.data.mask,
      connections: new Set<DeviceId>(),
      ...(this.data.type === DeviceType.Router && { routingTable: [] }), // Add routingTable if it is a router
    };

    // Add the device to the datagraph and the viewgraph
    datagraph.addDevice(this.data.id, deviceInfo as GraphNode);
    viewgraph.addDevice(this.data);
  }

  removeDevice(viewgraph: ViewGraph) {
    const device = viewgraph.getDevice(this.data.id);
    if (!device) {
      throw new Error(`Device with ID ${this.data.id} not found.`);
    }
    device.delete();
  }
}

// "Move" is here because it conflicts with AddDevice from viewportManager
export class AddDeviceMove extends AddRemoveDeviceMove {
  type = TypeMove.AddDevice;
  data: CreateDevice;

  undo(viewgraph: ViewGraph): void {
    this.removeDevice(viewgraph);
  }

  redo(viewgraph: ViewGraph): void {
    this.addDevice(viewgraph);
  }
}

// Check if the viewgraph is the best place to load the move into the manager
export class RemoveDeviceMove extends AddRemoveDeviceMove {
  type: TypeMove = TypeMove.RemoveDevice;
  data: CreateDevice; // Data of the removed device
  connections: { edgeId: number; adyacentId: DeviceId }[];
  routingTable?: RoutingTableEntry[]; // Store routing table if device is a router

  constructor(
    data: CreateDevice,
    connections: { edgeId: EdgeId; adyacentId: DeviceId }[],
    routingTable?: RoutingTableEntry[],
  ) {
    super(data);
    this.connections = connections;
    if (routingTable) {
      this.routingTable = [...routingTable]; // Store routing table to preserve data
    }
  }

  undo(viewgraph: ViewGraph): void {
    this.addDevice(viewgraph);
    const device = viewgraph.getDevice(this.data.id);

    this.connections.forEach((adyacentId) => {
      const adyacentDevice = viewgraph.getDevice(adyacentId);

      if (adyacentDevice) {
        viewgraph.addEdge(this.data.id, adyacentId);
        device.addConnection(adyacentId);
        adyacentDevice.addConnection(this.data.id);
      } else {
        console.warn(
          `Adjacent Device ${adyacentId} not found while reconnecting Device ${device.id}`,
        );
      }
    });

    // Restore routing table if it's a router
    if (this.data.type === DeviceType.Router && this.routingTable) {
      viewgraph.datagraph.setRoutingTable(this.data.id, this.routingTable);
    }
  }

  redo(viewgraph: ViewGraph): void {
    this.removeDevice(viewgraph);
  }
}
