import { Graphics } from "pixi.js";
import { Device } from "./../device"; // Import the Device class
import { Edge } from "./../edge";
import { DataGraph } from "./datagraph";
import { Viewport } from "../..";

export class ViewGraph {
  private devices = new Map<number, Device>();
  private edges = new Map<number, Edge>();
  private idCounter = 1;
  private datagraph: DataGraph;
  viewport: Viewport;

  constructor(datagraph: DataGraph, viewport: Viewport) {
    this.datagraph = datagraph;
    this.viewport = viewport;
    datagraph.constructView(this);
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

  // Add a connection between two devices
  addEdge(device1Id: number, device2Id: number): number | null {
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
        // Calculate the angle between the two devices
        const dx = device2.x - device1.x;
        const dy = device2.y - device1.y;
        const angle = Math.atan2(dy, dx);

        // Adjust start and end points to be on the edge of the icons
        const offsetX1 = (device1.width / 2) * Math.cos(angle);
        const offsetY1 = (device1.height / 2) * Math.sin(angle);
        const offsetX2 = (device2.width / 2) * Math.cos(angle);
        const offsetY2 = (device2.height / 2) * Math.sin(angle);

        const startPos = {
          x: device1.x + offsetX1,
          y: device1.y + offsetY1,
        };
        const endPos = {
          x: device2.x - offsetX2,
          y: device2.y - offsetY2,
        };

        // Create the edge as an instance of Edge
        const edge = new Edge(
          this.idCounter++,
          { n1: device1Id, n2: device2Id },
          startPos,
          endPos,
          this,
        );
        this.edges.set(edge.id, edge);

        this.datagraph.addEdge(device1Id, device2Id);
        this.viewport.addChild(edge);

        console.log(
          `Connection created between devices ID: ${device1Id} and ID: ${device2Id}`,
        );

        return edge.id;
      }
    }
    return null;
  }

  deviceMoved(deviceId: number) {
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
        const dx = endDevice.x - startDevice.x;
        const dy = endDevice.y - startDevice.y;
        const angle = Math.atan2(dy, dx);

        // Adjust start and end points to be on the edge of the icon
        const offsetX = (startDevice.width / 2) * Math.cos(angle);
        const offsetY = (startDevice.height / 2) * Math.sin(angle);

        // Calculate new positions for the start and end of the edge
        const newStartPos = {
          x: startDevice.x + offsetX,
          y: startDevice.y + offsetY,
        };
        const newEndPos = {
          x: endDevice.x - offsetX,
          y: endDevice.y - offsetY,
        };

        // Redraw the edge
        edge.drawEdge(newStartPos, newEndPos);
      }
    });
    this.datagraph.updateDevicePosition(deviceId, { x: device.x, y: device.y });
  }

  // Get all connections of a device
  getConnections(id: number): Edge[] {
    const device = this.devices.get(id);
    return device ? Array.from(this.edges.values()) : [];
  }

  // Get a specific device by its ID
  getDevice(id: number): Device | undefined {
    return this.devices.get(id);
  }

  // Get all devices in the graph
  getDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  // Get the number of devices in the graph
  getDeviceCount(): number {
    return this.devices.size;
  }

  // Clear the graph
  clear() {
    this.devices.forEach((device) => {
      device.deleteDevice();
    });
    // no edges should remain to delete
    this.devices.clear();
    this.edges.clear();
    this.idCounter = 1;
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
        edge.deleteEdge();
      }
    });

    // Remove the device from the viewport and destroy it
    this.viewport.removeChild(device);
    device.destroy({ children: true });

    // Finally, remove the device from the graph
    this.datagraph.removeDevice(id);
    this.devices.delete(id);
    console.log(
      `Device with ID ${id} and all its connections were removed.`,
    );
  }

  // Method to remove a specific edge by its ID
  removeEdge(edgeId: number) {
    const edge = this.edges.get(edgeId);

    if (!edge) {
      console.warn(`Edge with ID ${edgeId} does not exist in the graph.`);
      return;
    }

    // Get the IDs of the devices connected by this edge
    const { n1, n2 } = edge.connectedNodes;

    // Remove the connection from the connected devices
    const device1 = this.devices.get(n1);
    const device2 = this.devices.get(n2);

    if (device1) {
      device1.connections.delete(edgeId);
    }

    if (device2) {
      device2.connections.delete(edgeId);
    }

    // Remove the edge from the viewport and destroy it
    this.viewport.removeChild(edge);
    edge.destroy();

    // Remove the edge from the edges map and from datagraph
    this.datagraph.removeConnection(n1, n2);
    this.edges.delete(edgeId);

    console.log(
      `Edge with ID ${edgeId} removed between devices ${n1} and ${n2}.`,
    );
  }

  getViewport() {
    return this.viewport;
  }

  // Method to log all graph data to the console
  logGraphData() {
    console.log("===== ViewGraph Data =====");

    // Log device information
    console.log("Devices:");
    this.devices.forEach((device, id) => {
      console.log(`- ID: ${id}`);
      console.log(`  Type: ${device.constructor.name}`);
      console.log(`  Position: x=${device.x}, y=${device.y}`);
      console.log(
        `  Connections: ${Array.from(device.connections.keys()).join(", ") || "None"}`,
      );
    });

    // Log connection information
    console.log("Edges:");
    this.edges.forEach((edge, id) => {
      console.log(`- Edge ID: ${id}`);
      console.log(
        `  Connected Devices: ${edge.connectedNodes.n1} <-> ${edge.connectedNodes.n2}`,
      );
      console.log(
        `  Start Position: x=${edge.startPos.x}, y=${edge.startPos.y}`,
      );
      console.log(`  End Position: x=${edge.endPos.x}, y=${edge.endPos.y}`);
    });

    console.log("==========================");
  }
}
