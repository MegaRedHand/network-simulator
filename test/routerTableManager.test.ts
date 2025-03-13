import {
  DataGraph,
  DeviceId,
  RoutingTableEntry,
  RouterGraphNode,
  DeviceType,
} from "../src/types/graphs/datagraph";
import { RoutingTableManager } from "../src/types/graphs/utils.ts/routingTableManager";

class MockDataGraph extends DataGraph {
  private devices: Map<DeviceId, any> = new Map();

  constructor() {
    super();
  }

  addDevice(id: DeviceId, device: any) {
    this.devices.set(id, device);
  }

  getDevice(id: DeviceId) {
    return this.devices.get(id);
  }

  getDevices() {
    return this.devices.entries();
  }

  getConnections(id: DeviceId): DeviceId[] {
    return [];
  }

  notifyChanges() {
    // Mock notifyChanges method
  }
}

describe("RoutingTableManager", () => {
  let dataGraph: MockDataGraph;
  let routingTableManager: RoutingTableManager;

  beforeEach(() => {
    dataGraph = new MockDataGraph();
    routingTableManager = new RoutingTableManager(dataGraph);
  });

  test("should regenerate all routing tables", () => {
    const mockRouter: RouterGraphNode = {
      type: DeviceType.Router,
      x: 0,
      y: 0,
      ip: "192.168.1.1",
      mask: "255.255.255.0",
      mac: "00:00:00:00:00:01",
      arpTable: new Map(),
      routingTable: [],
    };
    dataGraph.addDevice(1, mockRouter);

    routingTableManager.regenerateAllRoutingTables();

    expect(mockRouter.routingTable).toBeDefined();
  });

  test("should regenerate routing table for a specific device", () => {
    const mockRouter: RouterGraphNode = {
      type: DeviceType.Router,
      x: 0,
      y: 0,
      ip: "192.168.1.1",
      mask: "255.255.255.0",
      mac: "00:00:00:00:00:01",
      arpTable: new Map(),
      routingTable: [],
    };
    dataGraph.addDevice(1, mockRouter);

    routingTableManager.regenerateRoutingTable(1);

    expect(mockRouter.routingTable).toBeDefined();
  });

  test("should regenerate routing table cleanly without preserving edits", () => {
    const mockRouter: RouterGraphNode = {
      type: DeviceType.Router,
      x: 0,
      y: 0,
      ip: "192.168.1.1",
      mask: "255.255.255.0",
      mac: "00:00:00:00:00:01",
      arpTable: new Map(),
      routingTable: [],
    };
    dataGraph.addDevice(1, mockRouter);

    const newTable = routingTableManager.regenerateRoutingTableClean(1);

    expect(newTable).toBeDefined();
  });

  test("should save manual changes to routing table", () => {
    const mockRouter: RouterGraphNode = {
      type: DeviceType.Router,
      x: 0,
      y: 0,
      ip: "192.168.1.1",
      mask: "255.255.255.0",
      mac: "00:00:00:00:00:01",
      arpTable: new Map(),
      routingTable: [
        {
          ip: "192.168.1.1",
          mask: "255.255.255.0",
          iface: 1,
          manuallyEdited: false,
        },
      ] as RoutingTableEntry[],
    };
    dataGraph.addDevice(1, mockRouter);

    routingTableManager.saveManualChange(1, 0, 0, "192.168.1.2"); // Cambiado a número el índice de la columna

    expect(mockRouter.routingTable[0].ip).toBe("192.168.1.2");
    expect(mockRouter.routingTable[0].manuallyEdited).toBe(true);
  });

  test("should set a new routing table for a router", () => {
    const mockRouter: RouterGraphNode = {
      type: DeviceType.Router,
      x: 0,
      y: 0,
      ip: "192.168.1.1",
      mask: "255.255.255.0",
      mac: "00:00:00:00:00:01",
      arpTable: new Map(),
      routingTable: [],
    };
    dataGraph.addDevice(1, mockRouter);

    const newRoutingTable: RoutingTableEntry[] = [
      {
        ip: "192.168.1.1",
        mask: "255.255.255.0",
        iface: 1,
        manuallyEdited: false,
      },
    ];

    routingTableManager.setRoutingTable(1, newRoutingTable);

    expect(mockRouter.routingTable).toEqual(newRoutingTable);
  });

  test("should remove a routing table row", () => {
    const mockRouter: RouterGraphNode = {
      type: DeviceType.Router,
      x: 0,
      y: 0,
      ip: "192.168.1.1",
      mask: "255.255.255.0",
      mac: "00:00:00:00:00:01",
      arpTable: new Map(),
      routingTable: [
        { ip: "192.168.1.1", mask: "255.255.255.0", iface: 1, deleted: false },
      ] as RoutingTableEntry[],
    };
    dataGraph.addDevice(1, mockRouter);

    routingTableManager.removeRoutingTableRow(1, 0);

    expect(mockRouter.routingTable[0].deleted).toBe(true);
  });

  test("should get the routing table for a device", () => {
    const mockRouter: RouterGraphNode = {
      type: DeviceType.Router,
      x: 0,
      y: 0,
      ip: "192.168.1.1",
      mask: "255.255.255.0",
      mac: "00:00:00:00:00:01",
      arpTable: new Map(),
      routingTable: [
        { ip: "192.168.1.1", mask: "255.255.255.0", iface: 1, deleted: false },
      ] as RoutingTableEntry[],
    };
    dataGraph.addDevice(1, mockRouter);

    const routingTable = routingTableManager.getRoutingTable(1);

    expect(routingTable).toEqual(mockRouter.routingTable);
  });
});
