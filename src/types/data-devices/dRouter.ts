import { Ticker } from "pixi.js";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DeviceType } from "../view-devices/vDevice";
import { DataGraph, DeviceId, RouterDataNode } from "../graphs/datagraph";
import { DataNetworkDevice } from "./dNetworkDevice";
import { ROUTER_CONSTANTS } from "../../utils/constants/router_constants";
import { EntryData, Table } from "../network-modules/tables/table";

export interface RoutingEntry extends EntryData {
  ip: string;
  mask: string;
  iface: number;
}

export class DataRouter extends DataNetworkDevice {
  private packetQueueSize: number;
  private packetQueue: PacketQueue;
  // Number of bytes to process per second
  private bytesPerSecond: number;
  // Number of bytes processed
  private processingProgress = 0;
  routingTable: Table<RoutingEntry>;
  routingTableEdited = false;
  routingTableEditedIps: string[] = [];

  constructor(graphData: RouterDataNode, datagraph: DataGraph) {
    super(graphData, datagraph);
    this.packetQueueSize =
      graphData.packetQueueSize ?? ROUTER_CONSTANTS.PACKET_QUEUE_MAX_SIZE;
    this.packetQueue = new PacketQueue(this.packetQueueSize);
    this.routingTable = new Table<RoutingEntry>(
      "ip",
      (
        (graphData.routingTable ?? []) as [string, string, number, boolean][]
      ).map(([ip, mask, iface, edited]) => ({ ip, mask, iface, edited })),
    );
    this.routingTableEdited = graphData.routingTableEdited ?? false;
    this.routingTableEditedIps = graphData.routingTableEditedIps ?? [];
    this.bytesPerSecond =
      graphData.bytesPerSecond ?? ROUTER_CONSTANTS.PROCESSING_SPEED;
  }

  setMaxQueueSize(newSize: number) {
    this.packetQueue.setMaxQueueSize(newSize);
    this.packetQueueSize = newSize;
  }

  setBytesPerSecond(newTime: number) {
    this.bytesPerSecond = newTime;
  }

  getDataNode(): RouterDataNode {
    return {
      ...super.getDataNode(),
      type: DeviceType.Router,
      routingTable: this.routingTable.serialize(
        (entry) =>
          [entry.ip, entry.mask, entry.iface, entry.edited ?? false] as [
            string,
            string,
            number,
            boolean,
          ],
      ),
      packetQueueSize: this.packetQueue.getMaxQueueSize(),
      routingTableEdited: this.routingTableEdited,
      routingTableEditedIps: this.routingTableEditedIps,
      bytesPerSecond: this.bytesPerSecond,
    };
  }

  receiveDatagram(datagram: IPv4Packet) {
    if (this.ownIp(datagram.destinationAddress)) {
      this.handlePacket(datagram);
      return;
    }
    this.addPacketToQueue(datagram);
  }

  addPacketToQueue(datagram: IPv4Packet) {
    const wasEmpty = this.packetQueue.isEmpty();
    if (!this.packetQueue.enqueue(datagram)) {
      console.debug("Packet queue full, dropping packet");
      return;
    }
    if (wasEmpty) {
      this.startPacketProcessor();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  processPacket(_ticker: Ticker) {
    // TODO: this is unused
  }

  startPacketProcessor() {
    this.processingProgress = 0;
    Ticker.shared.add(this.processPacket, this);
  }

  stopPacketProcessor() {
    this.processingProgress = 0;
    Ticker.shared.remove(this.processPacket, this);
  }

  getPacketsToProcess(timeMs: number): IPv4Packet | null {
    this.processingProgress += (this.bytesPerSecond * timeMs) / 1000;
    const packetLength = this.packetQueue.getHead()?.totalLength;
    if (this.processingProgress < packetLength) {
      return null;
    }
    this.processingProgress -= packetLength;
    return this.packetQueue.dequeue();
  }

  routePacket(datagram: IPv4Packet): DeviceId[] {
    const device = this.datagraph.getDevice(this.id);
    if (!device || !(device instanceof DataRouter)) {
      return;
    }

    const result = this.routingTable.all().find((entry) => {
      const ip = IpAddress.parse(entry.ip);
      const mask = IpAddress.parse(entry.mask);
      return datagram.destinationAddress.isInSubnet(ip, mask);
    });

    if (!result) {
      console.warn("No route found for", datagram.destinationAddress);
      return [];
    }

    const devices = this.datagraph.getConnectionsInInterface(
      this.id,
      result.iface,
    );

    if (!devices) {
      console.error("Current device doesn't exist!", this.id);
      return [];
    }

    return devices;
  }

  getType(): DeviceType {
    return DeviceType.Router;
  }
}

class PacketQueue {
  private queue: IPv4Packet[] = [];
  private queueSizeBytes = 0;
  private maxQueueSizeBytes: number;

  constructor(maxQueueSizeBytes: number) {
    this.maxQueueSizeBytes = maxQueueSizeBytes;
  }

  setMaxQueueSize(newSize: number) {
    this.maxQueueSizeBytes = newSize;
  }

  getMaxQueueSize(): number {
    return this.maxQueueSizeBytes;
  }

  enqueue(packet: IPv4Packet) {
    if (this.queueSizeBytes + packet.totalLength > this.maxQueueSizeBytes) {
      return false;
    }
    this.queue.push(packet);
    this.queueSizeBytes += packet.totalLength;
    return true;
  }

  dequeue(): IPv4Packet | undefined {
    if (this.queue.length === 0) {
      return;
    }
    const packet = this.queue.shift();
    this.queueSizeBytes -= packet.totalLength;
    return packet;
  }

  getHead(): IPv4Packet | undefined {
    return this.queue[0];
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
