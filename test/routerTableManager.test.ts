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

describe("RoutingTableManager - Utility Functions", () => {
  let dataGraph;
  let routingTableManager: RoutingTableManager;

  beforeEach(() => {
    dataGraph = new MockDataGraph();
    routingTableManager = new RoutingTableManager(dataGraph);
  });

  test("compareIPs should correctly compare two IP addresses", () => {
    expect(
      routingTableManager.compareIPs("192.168.0.1", "192.168.0.2"),
    ).toBeLessThan(0);
    expect(
      routingTableManager.compareIPs("192.168.0.2", "192.168.0.1"),
    ).toBeGreaterThan(0);
    expect(routingTableManager.compareIPs("192.168.0.1", "192.168.0.1")).toBe(
      0,
    );
  });

  test("differByOneBit should correctly determine if two IPs differ by one bit", () => {
    expect(
      routingTableManager.differByOneBit(
        "192.168.0.0",
        "192.168.1.0",
        "255.255.255.0",
      ),
    ).toBe(true);
    expect(
      routingTableManager.differByOneBit(
        "192.168.1.0",
        "192.168.2.0",
        "255.255.255.0",
      ),
    ).toBe(false);
  });

  test("getAggregatedMask should return the correct aggregated mask", () => {
    expect(routingTableManager.getAggregatedMask("255.255.255.0")).toBe(
      "255.255.254.0",
    );
    expect(routingTableManager.getAggregatedMask("255.255.254.0")).toBe(
      "255.255.252.0",
    );
  });

  test("subnetToPrefix should correctly convert subnet mask to prefix", () => {
    expect(routingTableManager.subnetToPrefix("255.255.255.0")).toBe(24);
    expect(routingTableManager.subnetToPrefix("255.255.254.0")).toBe(23);
  });

  test("prefixToSubnet should correctly convert prefix to subnet mask", () => {
    expect(routingTableManager.prefixToSubnet(24)).toBe("255.255.255.0");
    expect(routingTableManager.prefixToSubnet(23)).toBe("255.255.254.0");
  });

  test("getNetworkAddress should correctly compute the network address", () => {
    expect(
      routingTableManager.getNetworkAddress("192.168.0.1", "255.255.255.0"),
    ).toBe("192.168.0.0");
    expect(
      routingTableManager.getNetworkAddress("192.168.1.1", "255.255.254.0"),
    ).toBe("192.168.0.0");
  });

  test("ipToNumber should correctly convert IP to number", () => {
    expect(routingTableManager.ipToNumber("192.168.0.1")).toBe(3232235521);
    expect(routingTableManager.ipToNumber("255.255.255.255")).toBe(4294967295);
  });
});

describe("RoutingTableManager - Aggregation of Routing Entries", () => {
  let dataGraph;
  let routingTableManager: RoutingTableManager;

  beforeEach(() => {
    dataGraph = new MockDataGraph();
    routingTableManager = new RoutingTableManager(dataGraph);
  });

  test("should aggregate contiguous networks with the same iface", () => {
    const routingTable = [
      { ip: "192.168.0.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.1.0", mask: "255.255.255.0", iface: 1 },
    ];

    const aggregated = routingTableManager.aggregateRoutes(routingTable);

    expect(aggregated).toEqual([
      { ip: "192.168.0.0", mask: "255.255.254.0", iface: 1 },
    ]);
  });

  test("should not aggregate networks with different iface", () => {
    const routingTable = [
      { ip: "192.168.0.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.1.0", mask: "255.255.255.0", iface: 2 },
    ];

    const aggregated = routingTableManager.aggregateRoutes(routingTable);

    expect(aggregated).toEqual(routingTable);
  });

  test("should not change table if no networks are contiguous", () => {
    const routingTable = [
      { ip: "192.168.1.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.2.0", mask: "255.255.255.0", iface: 1 },
    ];

    const aggregated = routingTableManager.aggregateRoutes(routingTable);

    expect(aggregated).toEqual(routingTable);
  });

  test("should aggregate multiple contiguous networks", () => {
    const routingTable = [
      { ip: "192.168.0.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.1.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.2.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.3.0", mask: "255.255.255.0", iface: 1 },
    ];

    const aggregated = routingTableManager.aggregateRoutes(routingTable);

    expect(aggregated).toEqual([
      { ip: "192.168.0.0", mask: "255.255.252.0", iface: 1 },
    ]);
  });

  test("should aggregate networks with different masks but same iface", () => {
    const routingTable = [
      { ip: "192.168.0.0", mask: "255.255.254.0", iface: 1 },
      { ip: "192.168.2.0", mask: "255.255.254.0", iface: 1 },
    ];

    const aggregated = routingTableManager.aggregateRoutes(routingTable);

    expect(aggregated).toEqual([
      { ip: "192.168.0.0", mask: "255.255.252.0", iface: 1 },
    ]);
  });

  test("should handle single entry routing table", () => {
    const routingTable = [
      { ip: "192.168.0.0", mask: "255.255.255.0", iface: 1 },
    ];

    const aggregated = routingTableManager.aggregateRoutes(routingTable);

    expect(aggregated).toEqual(routingTable);
  });

  test("should aggregate networks with larger contiguous blocks", () => {
    const routingTable = [
      { ip: "192.168.0.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.1.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.2.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.3.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.4.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.5.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.6.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.7.0", mask: "255.255.255.0", iface: 1 },
    ];

    const aggregated = routingTableManager.aggregateRoutes(routingTable);

    expect(aggregated).toEqual([
      { ip: "192.168.0.0", mask: "255.255.248.0", iface: 1 },
    ]);
  });

  test("should aggregate networks with larger contiguous blocks v2", () => {
    const routingTable = [
      { ip: "192.168.0.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.1.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.2.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.3.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.4.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.5.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.6.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.7.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.8.0", mask: "255.255.255.0", iface: 1 },
    ];

    const aggregated = routingTableManager.aggregateRoutes(routingTable);

    expect(aggregated).toEqual([
      { ip: "192.168.0.0", mask: "255.255.248.0", iface: 1 },
      { ip: "192.168.8.0", mask: "255.255.255.0", iface: 1 },
    ]);
  });

  test("should aggregate networks with larger contiguous blocks v3", () => {
    const routingTable = [
      { ip: "192.168.0.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.2.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.3.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.4.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.5.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.6.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.7.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.8.0", mask: "255.255.255.0", iface: 1 },
    ];

    const aggregated = routingTableManager.aggregateRoutes(routingTable);

    expect(aggregated).toEqual([
      { ip: "192.168.4.0", mask: "255.255.252.0", iface: 1 },
      { ip: "192.168.2.0", mask: "255.255.254.0", iface: 1 },
      { ip: "192.168.0.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.8.0", mask: "255.255.255.0", iface: 1 },
    ]);
  });

  test("should not aggregate non-contiguous networks", () => {
    const routingTable = [
      { ip: "192.168.0.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.2.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.4.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.6.0", mask: "255.255.255.0", iface: 1 },
    ];

    const aggregated = routingTableManager.aggregateRoutes(routingTable);

    expect(aggregated).toEqual(routingTable);
  });

  test("should not aggregate networks with different prefix lengths", () => {
    const routingTable = [
      { ip: "192.168.1.0", mask: "255.255.254.0", iface: 1 },
      { ip: "192.168.0.0", mask: "255.255.255.0", iface: 1 },
    ];

    const aggregated = routingTableManager.aggregateRoutes(routingTable);

    expect(aggregated).toEqual(routingTable);
  });

  test("should aggregate networks with multiple contiguous blocks", () => {
    const routingTable = [
      { ip: "192.168.0.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.1.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.4.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.5.0", mask: "255.255.255.0", iface: 1 },
    ];

    const aggregated = routingTableManager.aggregateRoutes(routingTable);

    expect(aggregated).toEqual([
      { ip: "192.168.0.0", mask: "255.255.254.0", iface: 1 },
      { ip: "192.168.4.0", mask: "255.255.254.0", iface: 1 },
    ]);
  });

  test("should not aggregate networks with different subnets", () => {
    const routingTable = [
      { ip: "172.16.0.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.0.0", mask: "255.255.255.0", iface: 1 },
    ];

    const aggregated = routingTableManager.aggregateRoutes(routingTable);

    expect(aggregated).toEqual(routingTable);
  });

  test("should handle networks with multiple interfaces", () => {
    const routingTable = [
      { ip: "192.168.0.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.1.0", mask: "255.255.255.0", iface: 1 },
      { ip: "192.168.0.0", mask: "255.255.255.0", iface: 2 },
      { ip: "192.168.1.0", mask: "255.255.255.0", iface: 2 },
    ];

    const aggregated = routingTableManager.aggregateRoutes(routingTable);

    expect(aggregated).toEqual([
      { ip: "192.168.0.0", mask: "255.255.254.0", iface: 1 },
      { ip: "192.168.0.0", mask: "255.255.254.0", iface: 2 },
    ]);
  });

  test("should handle large number of entries efficiently", () => {
    const routingTable = [];
    for (let i = 0; i < 256; i++) {
      routingTable.push({ ip: `10.0.${i}.0`, mask: "255.255.255.0", iface: 1 });
    }

    const aggregated = routingTableManager.aggregateRoutes(routingTable);

    expect(aggregated).toEqual([
      { ip: "10.0.0.0", mask: "255.255.0.0", iface: 1 },
    ]);
  });
});
