// MARCADO V1
import { Ticker, View } from "pixi.js";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DeviceType } from "../view-devices/vDevice";
import { Layer } from "../layer";
import {
  DataGraph,
  DataNode,
  NetworkDataNode,
  DeviceId,
  RouterDataNode,
  RoutingTableEntry,
} from "../graphs/datagraph";
import { Packet, sendRawPacket } from "../packet";
import { DataNetworkDevice } from "./dNetworkDevice";
import { EthernetFrame } from "../../packets/ethernet";

export class DataRouter extends DataNetworkDevice {
  private packetQueue = new PacketQueue(1024);
  // Time in ms to process a single byte
  private timePerByte = 8;
  // Number of bytes processed
  private processingProgress = 0;
  routingTable: RoutingTableEntry[];

  constructor(graphData: RouterDataNode, datagraph: DataGraph) {
    super(graphData, datagraph);
    this.routingTable = graphData.routingTable ?? [];
  }

  getDataNode(): RouterDataNode {
    return {
      ...super.getDataNode(),
      type: DeviceType.Router,
      routingTable: this.routingTable,
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
      // TODO: Belonging layer should be known and not hardcoded
      sendRawPacket(this.datagraph, Layer.Network, this.id, newFrame, false);
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
      // console.debug("Considering entry:", entry);
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
