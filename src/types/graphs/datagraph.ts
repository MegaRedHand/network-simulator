export interface GraphNode {
  x: number;
  y: number;
  type: string;
  connections: Set<number>;
}

export interface GraphDataNode {
  id: number;
  x: number;
  y: number;
  type: string;
  connections: number[];
}

export type GraphData = GraphDataNode[];

export class DataGraph {
  private devices = new Map<number, GraphNode>();
  private idCounter = 1;
  private onChanges: (() => void)[] = [];

  static fromData(data: GraphData): DataGraph {
    const dataGraph = new DataGraph();
    data.forEach((nodeData: GraphDataNode) => {
      // ADD DATAGRAPH AND EDGES
      console.log(nodeData);
      const connections = new Set(nodeData.connections);
      const graphNode: GraphNode = {
        x: nodeData.x,
        y: nodeData.y,
        type: nodeData.type,
        connections: connections,
      };
      dataGraph.addDevice(nodeData.id, graphNode);
    });
    return dataGraph;
  }

  toData(): GraphData {
    const graphData: GraphData = [];

    // Serialize nodes
    this.getDevices().forEach(([id, info]) => {
      graphData.push({
        id: id,
        x: info.x,
        y: info.y,
        type: info.type, // Save the device type (Router, Server, PC)
        connections: Array.from(info.connections.values()),
      });
    });
    return graphData;
  }

  // Add a new device to the graph
  addNewDevice(deviceInfo: { x: number; y: number; type: string }): number {
    const id = this.idCounter++;
    const graphnode: GraphNode = {
      ...deviceInfo,
      connections: new Set<number>(),
    };
    this.devices.set(id, graphnode);
    console.log(`Device added with ID ${id}`);
    this.notifyChanges();
    return id;
  }

  // Add a device to the graph
  addDevice(idDevice: number, deviceInfo: GraphNode) {
    if (this.devices.has(idDevice)) {
      console.warn(`Device with ID ${idDevice} already exists in the graph.`);
      return;
    }
    this.devices.set(idDevice, deviceInfo);
    if (this.idCounter <= idDevice) {
      this.idCounter = idDevice + 1;
    }
    console.log(`Device added with ID ${idDevice}`);
    this.notifyChanges();
  }

  // Add a connection between two devices
  addEdge(n1Id: number, n2Id: number) {
    if (n1Id === n2Id) {
      console.warn(
        `Cannot create a connection between the same device (ID ${n1Id}).`,
      );
      return;
    }
    if (!this.devices.has(n1Id)) {
      console.warn(`Device with ID ${n1Id} does not exist in devices.`);
      return;
    }
    if (!this.devices.has(n2Id)) {
      console.warn(`Device with ID ${n2Id} does not exist in devices.`);
      return;
      // Check if an edge already exists between these two devices
    }
    if (this.devices.get(n1Id).connections.has(n2Id)) {
      console.warn(
        `Connection between ID ${n1Id} and ID ${n2Id} already exists.`,
      );
      return;
    }
    this.devices.get(n1Id).connections.add(n2Id);
    this.devices.get(n2Id).connections.add(n1Id);

    console.log(
      `Connection created between devices ID: ${n1Id} and ID: ${n2Id}`,
    );
    this.notifyChanges();
  }

  updateDevicePosition(id: number, newValues: { x?: number; y?: number }) {
    const deviceGraphNode = this.devices.get(id);
    if (!deviceGraphNode) {
      console.warn("Device’s id is not registered");
      return;
    }
    this.devices.set(id, { ...deviceGraphNode, ...newValues });
    this.notifyChanges();
  }

  getDevice(id: number): GraphNode | undefined {
    return this.devices.get(id);
  }

  // Get all connections of a device
  getConnections(id: number): number[] {
    const deviceInfo = this.devices.get(id);
    return deviceInfo.connections
      ? Array.from(deviceInfo.connections.values())
      : [];
  }

  // Get all devices in the graph
  getDevices(): [number, GraphNode][] {
    return Array.from(this.devices.entries());
  }

  // Get the number of devices in the graph
  getDeviceCount(): number {
    return this.devices.size;
  }

  // Method to remove a device and all its connections
  removeDevice(id: number): void {
    const device = this.devices.get(id);

    if (!device) {
      console.warn(`Device with ID ${id} does not exist in the graph.`);
      return;
    }

    // Remove the connection of the current node in connected devices
    device.connections.forEach((connectedId) => {
      // can be done directly by the device
      const connectedDevice = this.devices.get(connectedId);
      if (connectedDevice) {
        connectedDevice.connections.delete(id);
      }
    });

    // Remove the node from the graph
    this.devices.delete(id);
    console.log(`Device with ID ${id} and its connections were removed.`);
    this.notifyChanges();
  }

  // Method to remove a connection (edge) between two devices by their IDs
  removeConnection(n1Id: number, n2Id: number): void {
    const device1 = this.devices.get(n1Id);
    const device2 = this.devices.get(n2Id);

    if (!device1) {
      console.warn(`Device with ID ${n1Id} does not exist in the graph.`);
      return;
    }

    if (!device2) {
      console.warn(`Device with ID ${n2Id} does not exist in the graph.`);
      return;
    }

    // Check if the connection exists
    if (!device1.connections.has(n2Id) || !device2.connections.has(n1Id)) {
      console.warn(
        `Connection between ID ${n1Id} and ID ${n2Id} does not exist.`,
      );
      return;
    }

    // Remove the connection in both devices
    device1.connections.delete(n2Id);
    device2.connections.delete(n1Id);

    console.log(
      `Connection removed between devices ID: ${n1Id} and ID: ${n2Id}`,
    );
    this.notifyChanges();
  }

  subscribeChanges(callback: () => void) {
    this.onChanges.push(callback);
  }

  notifyChanges() {
    this.onChanges.forEach((callback) => callback());
  }
}
