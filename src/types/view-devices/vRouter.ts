import { DeviceType } from "./vDevice";
import { Layer } from "../layer";
import { ViewNetworkDevice } from "./vNetworkDevice";
import { ViewGraph } from "../graphs/viewgraph";
import RouterImage from "../../assets/router.svg";
import { Position } from "../common";
import { DeviceInfo, RightBar } from "../../graphics/right_bar";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DeviceId } from "../graphs/datagraph";
import { Texture, Ticker } from "pixi.js";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { GlobalContext } from "../../context";
import { DataRouter } from "../data-devices";
import { dropPacket, sendViewPacket } from "../packet";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { ROUTER_CONSTANTS } from "../../utils/constants/router_constants";

export class ViewRouter extends ViewNetworkDevice {
  static DEVICE_TEXTURE: Texture;

  private packetQueueSize: number;
  private packetQueue: PacketQueue;
  // Time in ms to process a single byte
  private timePerByte: number;
  // Number of bytes processed
  private processingProgress = 0;

  static getTexture() {
    if (!ViewRouter.DEVICE_TEXTURE) {
      ViewRouter.DEVICE_TEXTURE = Texture.from(RouterImage);
    }
    return ViewRouter.DEVICE_TEXTURE;
  }

  constructor(
    id: DeviceId,
    viewgraph: ViewGraph,
    ctx: GlobalContext,
    position: Position,
    mac: MacAddress,
    ip: IpAddress,
    mask: IpAddress,
    packetQueueSize: number = ROUTER_CONSTANTS.PACKET_QUEUE_MAX_SIZE,
    timePerByte: number = ROUTER_CONSTANTS.PROCESSING_SPEED,
  ) {
    super(id, ViewRouter.getTexture(), viewgraph, ctx, position, mac, ip, mask);
    this.packetQueueSize = packetQueueSize;
    this.packetQueue = new PacketQueue(this.packetQueueSize);
    this.timePerByte = timePerByte;
    console.log("packetQueueSize Vr", this.packetQueueSize);
    console.log("processingSpeed Vr", this.timePerByte);
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    info.addField(TOOLTIP_KEYS.IP_ADDRESS, this.ip.octets.join("."));

    info.addEmptySpace();

    info.addParameterGroup(TOOLTIP_KEYS.ROUTER_PARAMETERS, [
      {
        label: TOOLTIP_KEYS.PACKET_QUEUE_SIZE_PARAMETER,
        initialValue: this.packetQueue.getMaxQueueSize(),
        onChange: (newSize: number) => {
          this.modifyPacketQueueSize(newSize);
        },
      },
      {
        label: TOOLTIP_KEYS.PROCESSING_SPEED_PARAMETER,
        initialValue: this.timePerByte,
        onChange: (newSpeed: number) => {
          this.modifyProcessingSpeed(newSpeed);
        },
      },
    ]);

    info.addRoutingTable(this.viewgraph, this.id);

    RightBar.getInstance().renderInfo(info);
  }

  getLayer(): Layer {
    return Layer.Network;
  }

  getType(): DeviceType {
    return DeviceType.Router;
  }

  setMaxQueueSize(newSize: number) {
    this.packetQueue.setMaxQueueSize(newSize);
    console.log("Max queue size set to Vr", newSize);
    this.packetQueueSize = newSize;
  }

  setTimePerByte(newTime: number) {
    this.timePerByte = newTime;
    console.log("Time per byte set to Vr", newTime);
  }

  /**
   * Modifies the maximum packet queue size for the current device and updates
   * the corresponding device in the data graph if it is a `DataRouter`.
   *
   * @param newSize - The new maximum size for the packet queue.
   *
   * This method updates the internal maximum queue size of the device and ensures
   * that the associated `DataRouter` in the data graph reflects the same change.
   * If the device in the data graph is not a `DataRouter`, a warning is logged.
   */
  modifyPacketQueueSize(newSize: number): void {
    this.setMaxQueueSize(newSize);
    this.viewgraph.getDataGraph().modifyDevice(this.id, (device) => {
      if (device instanceof DataRouter) {
        device.setMaxQueueSize(newSize);
      } else {
        console.warn("Device is not a DataRouter, cannot set max queue size");
      }
    });
  }

  /**
   * Modifies the processing speed of the current device and updates the associated
   * data graph representation of the device if it is a `DataRouter`.
   *
   * @param newSpeed - The new processing speed to set, represented as the time per byte.
   *
   * This method updates the internal processing speed of the device by calling
   * `setTimePerByte` with the provided `newSpeed`. It also ensures that the
   * corresponding device in the data graph is updated with the same processing speed,
   * but only if the device is an instance of `DataRouter`. If the device is not a
   * `DataRouter`, a warning is logged to the console.
   */
  modifyProcessingSpeed(newSpeed: number): void {
    this.setTimePerByte(newSpeed);
    this.viewgraph.getDataGraph().modifyDevice(this.id, (device) => {
      if (device instanceof DataRouter) {
        device.setTimePerByte(newSpeed);
      } else {
        console.warn("Device is not a DataRouter, cannot set time per byte");
      }
    });
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
      // dummy values
      const frame = new EthernetFrame(this.mac, this.mac, datagram);
      dropPacket(this.viewgraph, this.id, frame);
      return;
    }
    if (wasEmpty) {
      this.startPacketProcessor();
    }
  }

  processPacket(ticker: Ticker) {
    const elapsedTime = ticker.deltaMS * this.viewgraph.getSpeed();
    const datagram = this.getPacketsToProcess(elapsedTime);
    if (!datagram) {
      return;
    }
    const devices = this.routePacket(datagram);

    if (!devices || devices.length === 0) {
      // dummy values
      const frame = new EthernetFrame(this.mac, this.mac, datagram);
      dropPacket(this.viewgraph, this.id, frame);
      return;
    }
    for (const nextHopId of devices) {
      // Wrap the datagram in a new frame
      const nextHop = this.viewgraph.getDevice(nextHopId);
      if (!nextHop) {
        console.error("Next hop not found");
        continue;
      }
      let dstMac;
      if (nextHop instanceof ViewNetworkDevice) {
        // If the next hop is a network device, use its MAC address
        dstMac = nextHop.mac;
      } else {
        const device = this.viewgraph.getDeviceByIP(
          datagram.destinationAddress,
        );
        if (!device) {
          console.error("Destination device not found");
          continue;
        }
        // If the next hop is not a network device, use the destination MAC address
        dstMac = device.mac;
      }
      const newFrame = new EthernetFrame(this.mac, dstMac, datagram);
      sendViewPacket(this.viewgraph, this.id, newFrame);
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
    const device = this.viewgraph.getDataGraph().getDevice(this.id);
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

    const devices = this.viewgraph
      .getDataGraph()
      .getConnectionsInInterface(this.id, result.iface);

    if (!devices) {
      console.error("Current device doesn't exist!", this.id);
      return [];
    }

    return devices;
  }
}

class PacketQueue {
  private queue: IPv4Packet[] = [];
  private queueSizeBytes = 0;
  private maxQueueSizeBytes: number;

  constructor(maxQueueSizeBytes: number) {
    this.maxQueueSizeBytes = maxQueueSizeBytes;
  }

  getMaxQueueSize(): number {
    return this.maxQueueSizeBytes;
  }
  setMaxQueueSize(newSize: number) {
    if (newSize >= 0) {
      this.maxQueueSizeBytes = newSize;
    } else {
      console.warn("Invalid queue size, keeping previous value");
    }
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
