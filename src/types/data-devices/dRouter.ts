import { Ticker } from "pixi.js";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DeviceType } from "../view-devices/vDevice";
import {
  DataGraph,
  DeviceId,
  RouterDataNode,
  RoutingTableEntry,
} from "../graphs/datagraph";
import { sendDataPacket } from "../packet";
import { DataNetworkDevice } from "./dNetworkDevice";
import { EthernetFrame } from "../../packets/ethernet";
import { ROUTER_CONSTANTS } from "../../utils/constants/router_constants";

export class DataRouter extends DataNetworkDevice {
  packetQueueSize: number;
  private packetQueue: PacketQueue;
  // Time in ms to process a single byte
  timePerByte: number;
  // Number of bytes processed
  private processingProgress = 0;
  routingTable: RoutingTableEntry[];

  constructor(graphData: RouterDataNode, datagraph: DataGraph) {
    super(graphData, datagraph);
    this.packetQueueSize =
      graphData.packetQueueSize ?? ROUTER_CONSTANTS.PACKET_QUEUE_MAX_SIZE;
    this.packetQueue = new PacketQueue(this.packetQueueSize);
    this.timePerByte =
      graphData.timePerByte ?? ROUTER_CONSTANTS.PROCESSING_SPEED;
    this.routingTable = graphData.routingTable ?? [];
    console.log("packetQueueSize Dr", this.packetQueueSize);
    console.log("processingSpeed Dr", this.timePerByte);
  }

  setMaxQueueSize(newSize: number) {
    this.packetQueue.setMaxQueueSize(newSize);
    console.log("Max queue size set to Dr", newSize);
    this.packetQueueSize = newSize;
  }

  setTimePerByte(newTime: number) {
    this.timePerByte = newTime;
    console.log("Time per byte set to Dr", newTime);
  }

  getDataNode(): RouterDataNode {
    return {
      ...super.getDataNode(),
      type: DeviceType.Router,
      routingTable: this.routingTable,
      packetQueueSize: this.packetQueue.getMaxQueueSize(),
      timePerByte: this.timePerByte,
    };
  }

  receiveDatagram(datagram: IPv4Packet) {
    if (this.ip.equals(datagram.destinationAddress)) {
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

  processPacket(ticker: Ticker) {
    const datagram = this.getPacketsToProcess(ticker.deltaMS);
    if (!datagram) {
      return;
    }
    const devices = this.routePacket(datagram);

    if (!devices || devices.length === 0) {
      return;
    }
    for (const nextHopId of devices) {
      // Wrap the datagram in a new frame
      const nextHop = this.datagraph.getDevice(nextHopId);
      if (!nextHop) {
        console.error("Next hop not found");
        continue;
      }
      const newFrame = new EthernetFrame(this.mac, nextHop.mac, datagram);
      sendDataPacket(this.datagraph, this.id, newFrame);
    }

    if (this.packetQueue.isEmpty()) {
      this.stopPacketProcessor();
    }
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
    this.processingProgress += timeMs;
    const packetLength = this.packetQueue.getHead()?.totalLength;
    const progressNeeded = this.timePerByte * packetLength;
    if (this.processingProgress < progressNeeded) {
      return null;
    }
    this.processingProgress -= progressNeeded;
    return this.packetQueue.dequeue();
  }

  routePacket(datagram: IPv4Packet): DeviceId[] {
    const device = this.datagraph.getDevice(this.id);
    if (!device || !(device instanceof DataRouter)) {
      return;
    }

    const result = device.routingTable.find((entry) => {
      if (entry.deleted) {
        console.debug("Skipping deleted entry:", entry);
        return false;
      }
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
    if (this.queueSizeBytes >= this.maxQueueSizeBytes) {
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
