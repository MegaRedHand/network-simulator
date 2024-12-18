import { Device } from "./../devices/index"; // Import the Device class
import { Edge } from "./../edge";
import { DataGraph, DeviceId, isRouter } from "./datagraph";
import { Viewport } from "../../graphics/viewport";
import { Layer } from "../devices/device";
import { createDevice } from "../devices/utils";

export type EdgeId = number;

export class ViewGraph {
  private devices: Map<DeviceId, Device> = new Map<DeviceId, Device>();
  private edges: Map<EdgeId, Edge> = new Map<EdgeId, Edge>();
  private idCounter: EdgeId = 1;
  private datagraph: DataGraph;
  private layer: Layer;
  viewport: Viewport;

  constructor(datagraph: DataGraph, viewport: Viewport, layer: Layer) {
    this.datagraph = datagraph;
    this.viewport = viewport;
    this.layer = layer;
    this.constructView();
  }

  private constructView() {
    // TODO: Adjust construction based on the selected layer in the future
    console.log("Constructing ViewGraph from DataGraph");
    const connections = new Set<{ deviceId: DeviceId; adyacentId: DeviceId }>();

    this.datagraph.getDevices().forEach(([deviceId, graphNode]) => {
      const deviceInfo = { ...graphNode, id: deviceId };
      const device: Device = createDevice(deviceInfo, this);

      this.viewport.addChild(device);

      this.addDevice(device);
      graphNode.connections.forEach((adyacentId) => {
        if (!connections.has({ deviceId: adyacentId, adyacentId: deviceId })) {
          connections.add({ deviceId, adyacentId });
        }
      });
    });

    console.log("Finished creating devices in ViewGraph");
    connections.forEach(({ deviceId, adyacentId }) => {
      const device1 = this.getDevice(deviceId);
      const device2 = this.getDevice(adyacentId);
      const edge = this.drawEdge(device1, device2);
      device1.addConnection(edge.id, device2.id);
      device2.addConnection(edge.id, device1.id);
    });
    console.log("Finished constructing ViewGraph");
  }

  // Add a device to the graph
  addDevice(device: Device) {
    if (!this.devices.has(device.id)) {
      this.devices.set(device.id, device);
      console.log(`Device added with ID ${device.id}`);
    } else {
      console.warn(`Device with ID ${device.id} already exists in the graph.`);
    }
  }

  drawEdge(device1: Device, device2: Device): Edge {
    const edge = new Edge(
      this.idCounter++,
      { n1: device1.id, n2: device2.id },
      device1,
      device2,
      this,
    );
    this.edges.set(edge.id, edge);
    this.viewport.addChild(edge);
    return edge;
  }

  // Add a connection between two devices
  addEdge(device1Id: DeviceId, device2Id: DeviceId): EdgeId | null {
    if (device1Id === device2Id) {
      console.warn(
        `Cannot create a connection between the same device (ID ${device1Id}).`,
      );
      return null;
    }

    if (!this.devices.has(device1Id)) {
      console.warn(`Device with ID ${device1Id} does not exist in devices.`);
    } else if (!this.devices.has(device2Id)) {
      console.warn(`Device with ID ${device2Id} does not exist in devices.`);
    } else {
      // Check if an edge already exists between these two devices
      for (const edge of this.edges.values()) {
        const { n1, n2 } = edge.connectedNodes;
        if (
          (n1 === device1Id && n2 === device2Id) ||
          (n1 === device2Id && n2 === device1Id)
        ) {
          console.warn(
            `Connection between ID ${device1Id} and ID ${device2Id} already exists.`,
          );
          return null;
        }
      }

      const device1 = this.devices.get(device1Id);
      const device2 = this.devices.get(device2Id);

      if (device1 && device2) {
        const edge = this.drawEdge(device1, device2);

        this.datagraph.addEdge(device1Id, device2Id);

        console.log(
          `Connection created between devices ID: ${device1Id} and ID: ${device2Id}`,
        );

        return edge.id;
      }
    }
    return null;
  }

  deviceMoved(deviceId: DeviceId) {
    const device: Device = this.devices.get(deviceId);
    device.getConnections().forEach((connection) => {
      const edge = this.edges.get(connection.edgeId);
      if (
        !(
          edge.connectedNodes.n1 == connection.adyacentId ||
          edge.connectedNodes.n2 == connection.adyacentId
        )
      ) {
        return;
      }
      // Get start and end devices directly
      const startDevice =
        edge.connectedNodes.n1 === device.id
          ? device
          : this.devices.get(connection.adyacentId);

      const endDevice =
        edge.connectedNodes.n1 === device.id
          ? this.devices.get(connection.adyacentId)
          : device;

      if (startDevice && endDevice) {
        edge.updatePosition(startDevice, endDevice);
      }
    });
    this.datagraph.updateDevicePosition(deviceId, { x: device.x, y: device.y });
  }

  // Get all connections of a device
  getConnections(id: DeviceId): Edge[] {
    const device = this.devices.get(id);
    return device ? Array.from(this.edges.values()) : [];
  }

  // Get a specific device by its ID
  getDevice(id: DeviceId): Device | undefined {
    return this.devices.get(id);
  }

  // Get all devices in the graph
  getDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  // Devuelve un array con solo los IDs de los dispositivos
  getDeviceIds(): DeviceId[] {
    return Array.from(this.devices.keys());
  }

  // Get the number of devices in the graph
  getDeviceCount(): number {
    return this.devices.size;
  }

  // Method to remove a device and its connections (edges)
  removeDevice(id: number) {
    const device = this.devices.get(id);

    if (!device) {
      console.warn(`Device with ID ${id} does not exist in the graph.`);
      return;
    }

    device.getConnections().forEach((connection) => {
      const adyacentDevice = this.devices.get(connection.adyacentId);
      const edge = this.edges.get(connection.edgeId);
      if (edge) {
        if (adyacentDevice) {
          adyacentDevice.removeConnection(edge.id);
        }
        edge.delete();
      }
    });

    // Remove the device from the viewport and destroy it
    this.viewport.removeChild(device);
    device.destroy();

    // Finally, remove the device from the graph
    this.datagraph.removeDevice(id);
    this.devices.delete(id);
    console.log(`Device with ID ${id} and all its connections were removed.`);
  }

  // Method to remove a specific edge by its ID
  removeEdge(edgeId: EdgeId) {
    const edge = this.edges.get(edgeId);

    if (!edge) {
      console.warn(`Edge with ID ${edgeId} does not exist in the graph.`);
      return;
    }

    this.datagraph.removeConnection(
      edge.connectedNodes.n1,
      edge.connectedNodes.n2,
    );
    // Call Edge's remove method to handle disconnection and cleanup
    edge.remove();

    // Remove the edge from the edges map in ViewGraph
    this.edges.delete(edgeId);

    console.log(`Edge with ID ${edgeId} successfully removed from ViewGraph.`);
  }

  getViewport() {
    return this.viewport;
  }

  getRoutingTable(id: DeviceId) {
    const device = this.datagraph.getDevice(id);
    if (!device || !isRouter(device)) {
      return [];
    }
    return device.routingTable;
  }

  // En ViewGraph
  getEdge(edgeId: EdgeId): Edge | undefined {
    return this.edges.get(edgeId);
  }

  /// Returns the IDs of the edges connecting the two devices
  getPathBetween(idA: DeviceId, idB: DeviceId): number[] {
    if (idA === idB) {
      return [];
    }
    const a = this.devices.get(idA);
    const b = this.devices.get(idB);
    if (!a || !b) {
      return [];
    }
    let current = a;
    const unvisitedNodes = [];
    const connectingEdges = new Map<DeviceId, EdgeId>([[a.id, null]]);
    while (current.id !== idB) {
      for (const [edgeId, adyacentId] of current.connections) {
        const edge = this.edges.get(edgeId);
        if (!connectingEdges.has(adyacentId)) {
          connectingEdges.set(adyacentId, edge.id);
          unvisitedNodes.push(this.devices.get(adyacentId));
        }
      }
      if (unvisitedNodes.length === 0) {
        return [];
      }
      current = unvisitedNodes.shift();
    }
    const path = [];
    while (current.id !== idA) {
      const edgeId = connectingEdges.get(current.id);
      path.push(edgeId);
      const edge = this.edges.get(edgeId);
      const parentId = edge.otherEnd(current.id);
      current = this.devices.get(parentId);
    }
    return path.reverse();
  }
}
