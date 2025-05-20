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
    interfaces: NetworkInterfaceData[],
    mask: IpAddress,
    packetQueueSize: number = ROUTER_CONSTANTS.PACKET_QUEUE_MAX_SIZE,
    timePerByte: number = ROUTER_CONSTANTS.PROCESSING_SPEED,
  ) {
    super(
      id,
      ViewRouter.getTexture(),
      viewgraph,
      ctx,
      position,
      interfaces,
      mask,
    );
    this.packetQueueSize = packetQueueSize;
    this.packetQueue = new PacketQueue(this.packetQueueSize);
    this.timePerByte = timePerByte;
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    this.interfaces.forEach((iface) =>
      info.addField(
        TOOLTIP_KEYS.IP_ADDRESS,
        iface.ip?.octets.join("."),
        TOOLTIP_KEYS.IP_ADDRESS,
      ),
    );

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
          initialValue: this.timePerByte,
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

  getTooltipDetails(layer: Layer): string {
    // TODO MAC-IP: See for what it is used this function so corrections can be done
    if (layer >= Layer.Network) {
      // If we are in the network layer or below, show only the IP
      return `IP: router ips`; //${this.ip.octets.join(".")}`;
    } else {
      // If we are in the upper layer, show both IP and MAC
      return `IP: router ips and mac`; //${this.ip.octets.join(".")}\nMAC: ${this.mac.toCompressedString()}`;
    }
  }

  setMaxQueueSize(newSize: number) {
    this.packetQueue.setMaxQueueSize(newSize);
    this.packetQueueSize = newSize;
  }

  setTimePerByte(newTime: number) {
    this.timePerByte = newTime;
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

  receiveDatagram(datagram: IPv4Packet, iface: number) {
    if (this.ownIp(datagram.destinationAddress)) {
      this.handleDatagram(datagram, iface);
      return;
    }
    this.addPacketToQueue(datagram);
  }

  addPacketToQueue(datagram: IPv4Packet) {
    const wasEmpty = this.packetQueue.isEmpty();
    if (!this.packetQueue.enqueue(datagram)) {
      console.debug("Packet queue full, dropping packet");
      // dummy values
      const dummyMac = this.interfaces[0].mac;
      const frame = new EthernetFrame(dummyMac, dummyMac, datagram);
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
    // TODO: routePacket would return the sending interface, then the function
    //       should find set the frame destination mac as the mac of the next
    //       network device to receive the packet (or its interface), and
    //       finally, call sendViewPacket, who would send the packet to all
    //       devices connected with the interface.
    const iface = this.routePacket(datagram);

    const dstDevice = this.viewgraph.getDeviceByIP(datagram.destinationAddress);
    // TODO: use arp table here?
    const { src, dst } = ViewNetworkDevice.getForwardingData(
      this.id,
      dstDevice.id,
      this.viewgraph,
    );

    const newFrame = new EthernetFrame(src.mac, dst.mac, datagram);
    sendViewPacket(this.viewgraph, this.id, newFrame, iface);

    // if (!devices || devices.length === 0) {
    //   // dummy values
    //   const frame = new EthernetFrame(this.mac, this.mac, datagram);
    //   dropPacket(this.viewgraph, this.id, frame);
    //   return;
    // }

    // // TODO: Simulates the mapping of the packet's destination MAC address to the next network device in the path.
    // // This could either be the final destination of the packet or an intermediate device along the route.
    // const dstDevice = this.viewgraph.getDeviceByIP(datagram.destinationAddress);
    // if (!dstDevice) {
    //   console.warn(
    //     `Device with ip ${datagram.destinationAddress.toString()} not found in viewgraph`,
    //   );
    //   return;
    // }
    // const path = this.viewgraph.getPathBetween(this.id, dstDevice.id);
    // let dstMac = dstDevice.mac;
    // if (!path) return;
    // for (const id of path.slice(1)) {
    //   const device = this.viewgraph.getDevice(id);
    //   // if there’s a router in the middle, first send frame to router mac
    //   if (device instanceof ViewNetworkDevice) {
    //     dstMac = device.mac;
    //     break;
    //   }
    // }
    // for (const nextHopId of devices) {
    //   const newFrame = new EthernetFrame(this.mac, dstMac, datagram);
    //   sendViewPacket(this.viewgraph, this.id, newFrame, nextHopId);
    // }

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

  routePacket(datagram: IPv4Packet): number {
    console.debug(
      `Device ${this.id} va a rutear el datagram con origen ${datagram.sourceAddress.toString()} y destino ${datagram.destinationAddress.toString()}`,
    );
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
      return undefined;
    }

    return result.iface;
    // const devices = this.viewgraph
    //   .getDataGraph()
    //   .getConnectionsInInterface(this.id, result.iface);

    // if (!devices) {
    //   console.error("Current device doesn't exist!", this.id);
    //   return [];
    // }

    // return devices;
  }
}

class PacketQueue {
  private queue: IPv4Packet[] = [];
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

  enqueue(packet: IPv4Packet) {
    if (this.queueSizeBytes + packet.totalLength > this.maxQueueSizeBytes) {
      return false;
    }
    this.queue.push(packet);
    this.queueSizeBytes += packet.totalLength;
    this.notifyObservers();
    return true;
  }

  dequeue(): IPv4Packet | undefined {
    if (this.queue.length === 0) {
      return;
    }
    const packet = this.queue.shift();
    this.queueSizeBytes -= packet.totalLength;
    this.notifyObservers();
    return packet;
  }

  getHead(): IPv4Packet | undefined {
    return this.queue[0];
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
