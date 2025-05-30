import { ViewDevice, DeviceType } from "./vDevice";
import { Layer } from "../layer";
import { ViewGraph } from "../graphs/viewgraph";
import SwitchImage from "../../assets/switch.svg";
import { Position } from "../common";
import {
  DeviceId,
  getNumberOfInterfaces,
  NetworkInterfaceData,
} from "../graphs/datagraph";
import { RightBar } from "../../graphics/right_bar";
import { Texture } from "pixi.js";
import { EthernetFrame, MacAddress } from "../../packets/ethernet";
import { GlobalContext } from "../../context";
import { sendViewPacket } from "../packet";
import { DataSwitch } from "../data-devices";
import { DeviceInfo } from "../../graphics/renderables/device_info";
import { ArpRequest } from "../../packets/arp";

export class ViewSwitch extends ViewDevice {
  static DEVICE_TEXTURE: Texture;

  static getTexture() {
    if (!ViewSwitch.DEVICE_TEXTURE) {
      ViewSwitch.DEVICE_TEXTURE = Texture.from(SwitchImage);
    }
    return ViewSwitch.DEVICE_TEXTURE;
  }

  constructor(
    id: DeviceId,
    viewgraph: ViewGraph,
    ctx: GlobalContext,
    position: Position,
    interfaces: NetworkInterfaceData[],
    tag: string,
  ) {
    super(
      id,
      ViewSwitch.getTexture(),
      viewgraph,
      ctx,
      position,
      interfaces,
      tag,
    );
  }

  showInfo(): void {
    const info = new DeviceInfo(this);
    info.addForwardingTable(this.viewgraph, this.id);
    RightBar.getInstance().renderInfo(info);
  }

  getLayer(): Layer {
    return Layer.Link;
  }

  getType(): DeviceType {
    return DeviceType.Switch;
  }

  getTooltipDetails(_layer: Layer, iface: number): string {
    if (iface >= this.interfaces.length) {
      console.error(
        `Interface idx ${iface + 1} overcome amount if interfaces ${this.interfaces.length}`,
      );
      return "";
    }
    return `MAC: ${this.interfaces[iface].mac.toCompressedString()}`;
  }

  updateForwardingTable(mac: MacAddress, iface: number): void {
    this.viewgraph.getDataGraph().modifyDevice(this.id, (device) => {
      if (!device) {
        console.error(`Switch with id ${this.id} not found in datagraph`);
        return;
      }
      if (device instanceof DataSwitch) {
        device.updateForwardingTable(mac, iface);
        this.showDeviceIconFor("update-ftable", "🔄", "Table Updated");
      }
    });
  }

  private forwardFrame(
    frame: EthernetFrame,
    sendingIface: number,
    iface: number,
  ) {
    if (sendingIface === iface) {
      // Packet would be sent to the interface where it came, discard it
      return;
    }

    // as this is a switch, frame.destination should already be
    // the mac of the next network device to receive the packet
    const newFrame = new EthernetFrame(
      this.interfaces[sendingIface].mac,
      frame.destination,
      frame.payload, // should be a copy
    );
    sendViewPacket(this.viewgraph, this.id, newFrame, sendingIface);
  }

  receiveFrame(frame: EthernetFrame, iface: number): void {
    if (frame.payload instanceof ArpRequest) {
      const { sha, spa, tha, tpa } = frame.payload;

      this.showDeviceIconFor("broadcast", "📢", "Broadcast");
      this.interfaces.forEach((sendingIface, idx) => {
        const packet = new ArpRequest(sha, spa, tpa, tha);
        const frame = new EthernetFrame(
          sendingIface.mac,
          MacAddress.broadcastAddress(),
          packet,
        );
        this.forwardFrame(frame, idx, iface);
      });
      return;
    }
    // Update the forwarding table with the source MAC address
    this.updateForwardingTable(frame.source, iface);

    // If the destination MAC address is in the forwarding table, send the frame
    // to the corresponding device
    // If the destination MAC address is not in the forwarding table, send the frame
    // to all devices connected to the switch
    const dDevice = this.viewgraph.getDataGraph().getDevice(this.id);
    if (!dDevice || !(dDevice instanceof DataSwitch)) {
      console.warn(`Switch with id ${this.id} not found in datagraph`);
      return;
    }
    const forwardingTable = dDevice.forwardingTable;
    const destEntry = forwardingTable.get(frame.destination.toString());
    const sendingIfaces: DeviceId[] =
      destEntry && !destEntry.deleted
        ? [destEntry.port]
        : Array.from(
            { length: getNumberOfInterfaces(this.getType()) },
            (_, i) => i,
          );

    if (sendingIfaces.length > 1) {
      this.showDeviceIconFor("broadcast", "📢", "Broadcast");
    }
    sendingIfaces.forEach((sendingIface) =>
      this.forwardFrame(frame, sendingIface, iface),
    );
  }
}
