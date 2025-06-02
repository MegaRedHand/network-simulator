import { DeviceType } from "./vDevice";
import { Layer } from "../layer";
import { ViewNetworkDevice } from "./vNetworkDevice";
import { ViewGraph } from "../graphs/viewgraph";
import RouterImage from "../../assets/router.svg";
import { Position } from "../common";
import { IpAddress, IPv4Packet } from "../../packets/ip";
import { DeviceId, NetworkInterfaceData } from "../graphs/datagraph";
import { Texture, Ticker } from "pixi.js";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { GlobalContext } from "../../context";
import { DataRouter } from "../data-devices";
import { dropPacket, sendViewPacket } from "../packet";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { ROUTER_CONSTANTS } from "../../utils/constants/router_constants";
import { DeviceInfo } from "../../graphics/renderables/device_info";
import { RightBar } from "../../graphics/right_bar";

export class ViewRouter extends ViewNetworkDevice {
  static DEVICE_TEXTURE: Texture;

  private packetQueueSize: number;
  private packetQueue: PacketQueue;
  // Number of bytes to process per second
  private bytesPerSecond: number;
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
    interfaces: NetworkInterfaceData[],
    tag: string,
    mask: IpAddress,
    packetQueueSize: number = ROUTER_CONSTANTS.PACKET_QUEUE_MAX_SIZE,
    bytesPerSecond: number = ROUTER_CONSTANTS.PROCESSING_SPEED,
  ) {
    super(
      id,
      ViewRouter.getTexture(),
      viewgraph,
      ctx,
      position,
      interfaces,
      tag,
      mask,
    );
    this.packetQueueSize = packetQueueSize;
    this.packetQueue = new PacketQueue(this.packetQueueSize);
    this.bytesPerSecond = bytesPerSecond;
  }

  showInfo(): void {
    const info = new DeviceInfo(this);

    info.addProgressBar(
      TOOLTIP_KEYS.PACKET_QUEUE_USAGE,
      this.packetQueue.getCurrentSize(),
      this.packetQueue.getMaxQueueSize(),
      (progressBar) => {
        // Suscribe
        this.packetQueue.subscribe(() => {
          progressBar.update(
            this.packetQueue.getCurrentSize(),
            this.packetQueue.getMaxQueueSize(),
          );
        });
      },
    );
    info.addDivider();
    info.addParameterGroup(
      TOOLTIP_KEYS.ROUTER_PARAMETERS,
      TOOLTIP_KEYS.ROUTER_PARAMETERS,
      [
        {
          label: TOOLTIP_KEYS.PACKET_QUEUE_SIZE_PARAMETER,
          initialValue: this.packetQueue.getMaxQueueSize(),
          onChange: (newSize: number) => {
            this.modifyPacketQueueSize(newSize);
          },
        },
        {
          label: TOOLTIP_KEYS.PROCESSING_SPEED_PARAMETER,
          initialValue: this.bytesPerSecond,
          onChange: (newSpeed: number) => {
            this.modifyProcessingSpeed(newSpeed);
          },
        },
      ],
    );

    info.addRoutingTable(this.viewgraph, this.id);

    info.addARPTable(this.viewgraph, this.id);

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
    this.packetQueueSize = newSize;
  }

  setBytesPerSecond(newTime: number) {
    this.bytesPerSecond = newTime;
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
   * `setBytesPerSecond` with the provided `newSpeed`. It also ensures that the
   * corresponding device in the data graph is updated with the same processing speed,
   * but only if the device is an instance of `DataRouter`. If the device is not a
   * `DataRouter`, a warning is logged to the console.
   */
  modifyProcessingSpeed(newSpeed: number): void {
    this.setBytesPerSecond(newSpeed);
    this.viewgraph.getDataGraph().modifyDevice(this.id, (device) => {
      if (device instanceof DataRouter) {
        device.setBytesPerSecond(newSpeed);
      } else {
        console.warn("Device is not a DataRouter, cannot set time per byte");
      }
    });
  }

  receiveDatagram(datagram: IPv4Packet, iface: number) {
    if (this.ownIp(datagram.destinationAddress)) {
      this.handleDatagram(datagram, iface);
      return;
    }
    this.addPacketToQueue(datagram, iface);
  }

  addPacketToQueue(datagram: IPv4Packet, iface: number) {
    const wasEmpty = this.packetQueue.isEmpty();
    datagram.timeToLive -= 1;
    if (datagram.timeToLive <= 0) {
      console.debug(`Device ${this.id} dropped packet with TTL 0`);
      this.dropPacket(datagram);
    }
    if (!this.packetQueue.enqueue(datagram, iface)) {
      console.debug("Packet queue full, dropping packet");
      this.showDeviceIconFor("queueFull", "❗", "Queue full");
      this.dropPacket(datagram);
      return;
    }
    if (wasEmpty) {
      this.startPacketProcessor();
    }
  }

  dropPacket(datagram: IPv4Packet) {
    // dummy values
    const dummyMac = this.interfaces[0].mac;
    const frame = new EthernetFrame(dummyMac, dummyMac, datagram);
    dropPacket(this.viewgraph, this.id, frame);
  }

  processPacket(ticker: Ticker) {
    const elapsedTime = ticker.deltaMS * this.viewgraph.getSpeed();
    const packetWithIface = this.getPacketsToProcess(elapsedTime);
    if (!packetWithIface) {
      return;
    }
    const datagram = packetWithIface.packet;

    const iface = this.routePacket(datagram);

    if (iface === packetWithIface.iface) {
      console.debug(
        "Packet dropped, since it was going to be sent back to the same interface.",
      );
      return;
    }

    const dstDevice = this.viewgraph.getDeviceByIP(datagram.destinationAddress);
    // TODO: use arp table here?
    const forwardingData = ViewNetworkDevice.getForwardingData(
      this.id,
      dstDevice?.id,
      this.viewgraph,
    );
    if (forwardingData) {
      const { src, nextHop } = forwardingData;
      let nextHopMac: MacAddress;
      if (forwardingData.sendingIface === iface) {
        nextHopMac = nextHop.mac;
      } else {
        // Try to deduce next hop from the routing table
        // If the interface connects to a router, just send it
        const connections = this.viewgraph
          .getDataGraph()
          .getConnectionsInInterface(this.id, iface);
        const nextHopId = connections[0];
        const edge = this.viewgraph.getEdge(this.id, nextHopId);
        const nextHopIface = edge.getDeviceInterface(nextHopId);
        const nextHop = this.viewgraph.getDevice(nextHopId);
        nextHopMac = nextHop.interfaces[nextHopIface].mac;
      }
      const newFrame = new EthernetFrame(src.mac, nextHopMac, datagram);
      sendViewPacket(this.viewgraph, this.id, newFrame, iface);
    } else {
      console.debug(`Router ${this.id} could not forward packet.`);
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

  getPacketsToProcess(timeMs: number): PacketWithIface | null {
    this.processingProgress += (this.bytesPerSecond * timeMs) / 1000;
    const packetLength = this.packetQueue.getHead()?.packet?.totalLength;
    if (this.processingProgress < packetLength) {
      return null;
    }
    this.processingProgress -= packetLength;
    return this.packetQueue.dequeue();
  }

  routePacket(datagram: IPv4Packet): number {
    console.debug(
      `Device ${this.id} will route datagram of origin ${datagram.sourceAddress.toString()} and destination ${datagram.destinationAddress.toString()}`,
    );
    const device = this.viewgraph.getDataGraph().getDevice(this.id);
    if (!device || !(device instanceof DataRouter)) {
      return;
    }

    const result = device.routingTable.allActive().find((entry) => {
      const ip = IpAddress.parse(entry.ip);
      const mask = IpAddress.parse(entry.mask);
      return datagram.destinationAddress.isInSubnet(ip, mask);
    });

    if (!result) {
      console.warn("No route found for", datagram.destinationAddress);
      return undefined;
    }

    return result.iface;
  }
}

interface PacketWithIface {
  packet: IPv4Packet;
  iface: number;
}

class PacketQueue {
  // Queue of packets with the interface they were received on
  private queue: PacketWithIface[] = [];
  private queueSizeBytes = 0;
  private maxQueueSizeBytes: number;

  private observers: (() => void)[] = [];

  constructor(maxQueueSizeBytes: number) {
    this.maxQueueSizeBytes = maxQueueSizeBytes;
  }

  // method to subscribe to changes
  subscribe(observer: () => void): void {
    this.observers.push(observer);
  }

  // method to notify all observers
  private notifyObservers(): void {
    this.observers.forEach((observer) => observer());
  }

  getCurrentSize(): number {
    return this.queueSizeBytes;
  }

  getMaxQueueSize(): number {
    return this.maxQueueSizeBytes;
  }
  setMaxQueueSize(newSize: number) {
    if (newSize >= 0) {
      this.maxQueueSizeBytes = newSize;
      this.notifyObservers();
    } else {
      console.warn("Invalid queue size, keeping previous value");
    }
  }

  enqueue(packet: IPv4Packet, iface: number) {
    if (this.queueSizeBytes + packet.totalLength > this.maxQueueSizeBytes) {
      return false;
    }
    this.queue.push({ packet, iface });
    this.queueSizeBytes += packet.totalLength;
    this.notifyObservers();
    return true;
  }

  dequeue(): PacketWithIface | undefined {
    if (this.queue.length === 0) {
      return;
    }
    const { packet, iface } = this.queue.shift();
    this.queueSizeBytes -= packet.totalLength;
    this.notifyObservers();
    return { packet, iface };
  }

  getHead(): PacketWithIface | undefined {
    return this.queue[0];
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
